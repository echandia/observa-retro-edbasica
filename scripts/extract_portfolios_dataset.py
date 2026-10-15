#!/usr/bin/env python3
"""
Extrae, segmenta y calibra los portafolios docentes reales del año 2025 de Práctica IV
ubicados en 'PRACTICA IV/PORTAFOLIO' para generar un conjunto de datos calibrado
con ejemplos de desempeños, capítulos y evidencias de competencias.
"""

import os
import re
import json
import zipfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTAFOLIO_DIR = os.path.join(BASE_DIR, "PRACTICA IV", "PORTAFOLIO")
OUT_JSON = os.path.join(BASE_DIR, "data", "calibrated_portfolios_2025.json")

def extract_paragraphs_from_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as z:
            if "word/document.xml" not in z.namelist():
                return []
            xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            paragraphs = []
            for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                text = "".join(node.text for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if node.text)
                text = text.strip()
                if text:
                    paragraphs.append(text)
            return paragraphs
    except Exception as e:
        return []

# Secciones típicas de la Rúbrica Analítica de Portafolio Docente PPIV
SECTION_PATTERNS = [
    ("resumen", re.compile(r"^(?:1\.|2\.)?\s*resumen\b", re.IGNORECASE)),
    ("abstract", re.compile(r"^(?:2\.|3\.)?\s*abstract\b", re.IGNORECASE)),
    ("introduccion", re.compile(r"^(?:3\.|4\.)?\s*introducci[oó]n\b", re.IGNORECASE)),
    ("diagnostico", re.compile(r"^(?:4\.|5\.)?\s*(?:dimensionamiento|diagn[oó]stico|caracterizaci[oó]n)\b", re.IGNORECASE)),
    ("situacion_observada", re.compile(r"^(?:5\.|6\.)?\s*(?:situaci[oó]n pedag[oó]gica|necesidad detectada|problema)\b", re.IGNORECASE)),
    ("secuencia_didactica", re.compile(r"^(?:6\.|7\.)?\s*(?:secuencia did[aá]ctica|planificaci[oó]n)\b", re.IGNORECASE)),
    ("reflexion_docente", re.compile(r"^(?:7\.|8\.)?\s*reflexi[oó]n docente\b", re.IGNORECASE)),
    ("conclusiones", re.compile(r"^(?:8\.|9\.)?\s*(?:conclusi[oó]n|conclusiones|plan de desarrollo)\b", re.IGNORECASE)),
    ("bibliografia", re.compile(r"^(?:9\.|10\.)?\s*(?:bibliograf[ií]a|referencias)\b", re.IGNORECASE)),
    ("anexos", re.compile(r"^(?:10\.|11\.)?\s*anexos?\b", re.IGNORECASE))
]

def segment_portfolio(paragraphs):
    sections = {}
    current_key = "portada"
    sections[current_key] = []

    for p in paragraphs:
        matched_key = None
        # Solo evaluar párrafos cortos como posibles encabezados de sección
        if len(p) < 80:
            for key, pattern in SECTION_PATTERNS:
                if pattern.search(p):
                    matched_key = key
                    break
        
        if matched_key:
            current_key = matched_key
            if current_key not in sections:
                sections[current_key] = []
        else:
            sections[current_key].append(p)

    return sections

def classify_competency_snippets(sections):
    """
    Identifica párrafos clave que ejemplifican competencias PEB en las reflexiones y diagnósticos.
    """
    text_corpus = " ".join(sections.get("reflexion_docente", []) + sections.get("situacion_observada", []) + sections.get("conclusiones", []))
    
    snippets = {
        "CG1": [], # Diagnóstico social, ético, necesidades
        "CG2": [], # Comunicación profesional, lenguaje
        "CG3": [], # Inglés, bilingüe
        "CE1": [], # Inclusión, DUA, diversidad, NEE, andamiaje
        "CE2": [], # Planificación, evaluación formativa, rúbrica
        "CE3": [], # Reflexión crítica, evidencia, investigación
        "CE4": [], # Interdisciplinariedad, contexto cultural
        "CE5": []  # Didáctica específica (matemática, ciencias, lenguaje)
    }

    paragraphs = sections.get("reflexion_docente", []) + sections.get("conclusiones", [])
    for p in paragraphs:
        p_lower = p.lower()
        if any(w in p_lower for w in ["inclusión", "diversidad", "dua", "necesidades educativas", "adaptación", "andamiaje", "ritmos de aprendizaje"]):
            snippets["CE1"].append(p[:280])
        if any(w in p_lower for w in ["evaluación formativa", "instrumento", "criterio de evaluación", "indicador", "rúbrica"]):
            snippets["CE2"].append(p[:280])
        if any(w in p_lower for w in ["evidencia", "análisis crítico", "investigación", "mi propia práctica", "retroalimentación", "reorientar"]):
            snippets["CE3"].append(p[:280])
        if any(w in p_lower for w in ["interdisciplin", "patrimonio", "contexto local", "articulación entre", "ciencias y", "lenguaje y"]):
            snippets["CE4"].append(p[:280])
        if any(w in p_lower for w in ["matemática", "fracciones", "geometría", "ciencias naturales", "comprensión lectora", "escritura", "didáctica"]):
            snippets["CE5"].append(p[:280])
        if any(w in p_lower for w in ["inglés", "english", "vocabulario", "abstract"]):
            snippets["CG3"].append(p[:280])
        if any(w in p_lower for w in ["ética", "social", "bien común", "entorno escolar", "vulnerabilidad", "comunidad"]):
            snippets["CG1"].append(p[:280])
        if any(w in p_lower for w in ["comunicación", "claridad", "instrucción", "preguntas guiadas"]):
            snippets["CG2"].append(p[:280])

    # Limitar a los 3 mejores por portafolio
    for k in snippets:
        snippets[k] = snippets[k][:3]

    return snippets

def analyze_portfolios():
    dataset = []
    summary_by_teacher = {}

    for root, dirs, files in os.walk(PORTAFOLIO_DIR):
        for f in files:
            if f.startswith(".") or not f.lower().endswith(".docx"):
                continue
            
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, PORTAFOLIO_DIR)
            folder_parts = rel_path.split(os.sep)
            teacher = folder_parts[0] if len(folder_parts) > 1 else "General"
            
            paragraphs = extract_paragraphs_from_docx(full_path)
            if len(paragraphs) < 10:
                continue

            sections = segment_portfolio(paragraphs)
            snippets = classify_competency_snippets(sections)

            student_name = f.replace("Portafolio Docente", "").replace("Portafolio", "").replace("PPIV", "").replace(".docx", "").strip(" _-")
            if not student_name:
                student_name = "Estudiante Práctica IV"

            # Resumen de métricas de la muestra
            word_count = sum(len(p.split()) for p in paragraphs)
            has_reflexion = len(sections.get("reflexion_docente", [])) > 0
            has_diagnostico = len(sections.get("diagnostico", [])) > 0
            has_secuencia = len(sections.get("secuencia_didactica", [])) > 0

            entry = {
                "archivo": f,
                "ruta_relativa": rel_path,
                "profesor_seccion": teacher,
                "estudiante_detectado": student_name,
                "total_parrafos": len(paragraphs),
                "total_palabras": word_count,
                "secciones_detectadas": list(sections.keys()),
                "extracto_resumen": " ".join(sections.get("resumen", []))[:300] if sections.get("resumen") else "",
                "extracto_reflexion": " ".join(sections.get("reflexion_docente", []))[:400] if sections.get("reflexion_docente") else "",
                "evidencias_competencias": snippets
            }
            dataset.append(entry)

            if teacher not in summary_by_teacher:
                summary_by_teacher[teacher] = 0
            summary_by_teacher[teacher] += 1

    # Construir banco de calibración para el motor pedagógico
    benchmarks = {
        "metadatos": {
            "anio": 2025,
            "carrera": "Pedagogía en Educación Básica",
            "asignatura": "Práctica Pedagógica IV",
            "total_portafolios_analizados": len(dataset),
            "distribucion_secciones": summary_by_teacher
        },
        "criterios_rubrica_portafolio": [
            "Aspectos Formales",
            "Resumen (200 a 250 palabras)",
            "Abstract (inglés bilingüe e inclusivo)",
            "Introducción (propósito, inclusión, interdisciplinariedad)",
            "Dimensionamiento Institucional y Diagnóstico (cognitivo, socioemocional, DIA/SIMCE)",
            "Situación Pedagógica Observada (necesidad fundada teóricamente)",
            "Secuencia Didáctica de Aula (planificación implementada)",
            "Reflexión Docente Crítica (decisiones didácticas, relación teoría-práctica, evidencias de aprendizaje)",
            "Conclusiones Finales y Plan de Desarrollo Profesional",
            "Bibliografía y Citas Normativas/Académicas",
            "Anexos (guía de aprendizaje, instrumentos, evidencias)"
        ],
        "portafolios": dataset
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(benchmarks, f, ensure_ascii=False, indent=2)

    print(f"Dataset de calibración de portafolios 2025 generado en {OUT_JSON}")
    print(f"Total portafolios DOCX procesados y estructurados: {len(dataset)}")
    for t, count in summary_by_teacher.items():
        print(f"  - {t}: {count} portafolios")

if __name__ == "__main__":
    analyze_portfolios()
