#!/usr/bin/env python3
"""
Extractor universal de documentos .docx para Observa-Retro Educación Básica.
Soporta extracción de texto plano y parseo estructurado de la plantilla de planificación oficial de PPIV.
"""

import sys
import json
import zipfile
import re
import xml.etree.ElementTree as ET

def extract_paragraphs(file_path):
    try:
        with zipfile.ZipFile(file_path) as z:
            if "word/document.xml" not in z.namelist():
                return []
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            paragraphs = []
            for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                text = "".join(node.text for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if node.text)
                text = re.sub(r'[\s\u00A0\u202F\u200B]+', ' ', text).strip()
                if text:
                    paragraphs.append(text)
            return paragraphs
    except Exception as e:
        sys.stderr.write(f"Error extracting docx: {e}\n")
        return []

def parse_lesson_plan(paragraphs):
    """
    Parsea las secciones de la plantilla de planificación docente de PPIV.
    """
    raw_text = "\n".join(paragraphs)
    
    plan = {
        "propuesta_pedagogica": "",
        "nivel_educativo": "",
        "asignatura": "",
        "unidad": "",
        "duracion": "",
        "oa_previo": "",
        "oa_trabajar": "",
        "oa_futuro": "",
        "objetivo_clase": "",
        "objetivo_transversal": "",
        "indicadores_evaluacion": "",
        "inicio": "",
        "desarrollo": "",
        "cierre": "",
        "recursos": "",
        "evaluacion": "",
        "raw_text": raw_text
    }

    # Búsqueda heurística de campos en los párrafos
    headers_to_skip = {"fecha", "objetivo de la clase", "actividades", "recursos", "evaluación", "evaluacion", "contenido", "4°–5° básico", "6°–8° básico"}

    for i, p in enumerate(paragraphs):
        p_lower = p.lower().strip()
        
        # Propuesta o título
        if "intervención 1" in p_lower or "intervencion 1" in p_lower or "propuesta pedagógica" in p_lower:
            plan["propuesta_pedagogica"] = p.strip()
            if i+1 < len(paragraphs) and paragraphs[i+1].startswith("“"):
                plan["propuesta_pedagogica"] += " " + paragraphs[i+1].strip()
        
        # Cursos / Nivel
        if ("cursos:" in p_lower or "curso:" in p_lower or "nivel educativo" in p_lower) and not plan["nivel_educativo"]:
            plan["nivel_educativo"] = p.split(":", 1)[-1].strip() or (paragraphs[i+1].strip() if i+1 < len(paragraphs) else "")

        # Duración
        if ("duración:" in p_lower or "duracion:" in p_lower) and not plan["duracion"]:
            plan["duracion"] = p.split(":", 1)[-1].strip()

        # OA Curricular / Propósito
        if ("objetivo de aprendizaje del curriculum a trabajar" in p_lower or "oa a trabajar" in p_lower) and not plan["oa_trabajar"]:
            plan["oa_trabajar"] = paragraphs[i+1].strip() if i+1 < len(paragraphs) else ""
        elif ("1. propósito" in p_lower or "propósito" == p_lower or "proposito" == p_lower) and not plan["oa_trabajar"]:
            plan["oa_trabajar"] = paragraphs[i+1].strip() if i+1 < len(paragraphs) else ""

        # Objetivo de la clase
        if ("objetivo de clase" in p_lower or "objetivo de la clase" in p_lower) and not plan["objetivo_clase"]:
            if ":" in p and len(p.split(":", 1)[-1].strip()) > 10:
                plan["objetivo_clase"] = p.split(":", 1)[-1].strip()
            else:
                # Buscar en párrafos siguientes el primer texto sustantivo que no sea cabecera ni fecha
                for k in range(i+1, min(i+8, len(paragraphs))):
                    cand = paragraphs[k].strip()
                    cand_lower = cand.lower()
                    is_date = bool(re.search(r'\d{1,2}\s+de\s+[a-záéíóú]+\s+del?\s+\d{4}', cand_lower))
                    if cand_lower not in headers_to_skip and not is_date and not cand_lower.startswith("inicio") and len(cand) > 15:
                        plan["objetivo_clase"] = cand
                        break

        # OAT
        if ("objetivo de aprendizaje transversal:" in p_lower or "oat:" in p_lower) and not plan["objetivo_transversal"]:
            plan["objetivo_transversal"] = p.split(":", 1)[-1].strip() or (paragraphs[i+1].strip() if i+1 < len(paragraphs) else "")

        # Momentos didácticos: Inicio
        if (p_lower.startswith("inicio") or "inicio (" in p_lower or "inicio:" in p_lower) and not plan["inicio"] and len(p_lower) < 40:
            inicio_parts = []
            for j in range(i, min(i+30, len(paragraphs))):
                pj = paragraphs[j].lower()
                if j > i and (pj.startswith("desarrollo") or "desarrollo (" in pj or "desarrollo:" in pj):
                    break
                inicio_parts.append(paragraphs[j].strip())
            plan["inicio"] = " ".join([x for x in inicio_parts if x])

        # Momentos didácticos: Desarrollo
        if (p_lower.startswith("desarrollo") or "desarrollo (" in p_lower or "desarrollo:" in p_lower) and not plan["desarrollo"] and len(p_lower) < 40:
            des_parts = []
            for j in range(i, min(i+55, len(paragraphs))):
                pj = paragraphs[j].lower()
                if j > i and (pj.startswith("cierre") or "cierre (" in pj or "cierre:" in pj):
                    break
                des_parts.append(paragraphs[j].strip())
            plan["desarrollo"] = " ".join([x for x in des_parts if x])

        # Momentos didácticos: Cierre
        if (p_lower.startswith("cierre") or "cierre (" in p_lower or "cierre:" in p_lower) and not plan["cierre"] and len(p_lower) < 40:
            cie_parts = []
            for j in range(i, min(i+35, len(paragraphs))):
                pj = paragraphs[j].lower()
                if j > i and ("recursos" in pj or "evaluación" in pj or "¿cuáles son" in pj):
                    break
                cie_parts.append(paragraphs[j].strip())
            plan["cierre"] = " ".join([x for x in cie_parts if x])

    # Si aún no tiene OA pero tiene objetivo de clase, usarlo como base curricular
    if not plan["oa_trabajar"] and plan["objetivo_clase"]:
        plan["oa_trabajar"] = plan["objetivo_clase"]

    # Si aún no tiene objetivo de clase pero tiene OA, usar OA
    if not plan["objetivo_clase"] and plan["oa_trabajar"]:
        plan["objetivo_clase"] = plan["oa_trabajar"]

    # Si no se detectaron partes específicas mediante claves, asignar párrafos por bloques
    if not plan["inicio"] and len(paragraphs) > 5:
        third = len(paragraphs) // 3
        plan["inicio"] = " ".join(paragraphs[1:third])
        plan["desarrollo"] = " ".join(paragraphs[third:2*third])
        plan["cierre"] = " ".join(paragraphs[2*third:])

    return plan

    # Si aún no tiene OA pero tiene objetivo de clase, usarlo como base curricular
    if not plan["oa_trabajar"] and plan["objetivo_clase"]:
        plan["oa_trabajar"] = plan["objetivo_clase"]

    # Si aún no tiene objetivo de clase pero tiene OA, usar OA
    if not plan["objetivo_clase"] and plan["oa_trabajar"]:
        plan["objetivo_clase"] = plan["oa_trabajar"]

    # Si no se detectaron partes específicas mediante claves, asignar párrafos por bloques
    if not plan["inicio"] and len(paragraphs) > 5:
        third = len(paragraphs) // 3
        plan["inicio"] = " ".join(paragraphs[1:third])
        plan["desarrollo"] = " ".join(paragraphs[third:2*third])
        plan["cierre"] = " ".join(paragraphs[2*third:])

    return plan

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Uso: python3 extract_docx.py <archivo.docx> [--json]\n")
        sys.exit(1)

    file_path = sys.argv[1]
    paragraphs = extract_paragraphs(file_path)
    
    if len(sys.argv) > 2 and sys.argv[2] == "--json":
        parsed = parse_lesson_plan(paragraphs)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
    else:
        print("\n".join(paragraphs))
