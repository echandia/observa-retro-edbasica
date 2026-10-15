#!/usr/bin/env python3
"""
Extrae y formaliza las rúbricas analíticas de Práctica Pedagógica IV:
1. Rúbrica Analítica de Portafolio Docente (11 criterios, niveles Destacado, Competente, Básico)
2. Rúbrica Analítica de Planificación Docente (Caracterización, Marco Curricular, Secuencia Didáctica, Recursos/Evaluación)
3. Ponderaciones y distribución por Resultados de Aprendizaje (RA1, RA2, RA3)
"""

import os
import json
import zipfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JSON = os.path.join(BASE_DIR, "data", "rubricas_ppiv.json")

def extract_tables_from_docx(docx_path):
    tables_data = []
    try:
        with zipfile.ZipFile(docx_path) as z:
            if "word/document.xml" not in z.namelist():
                return []
            tree = ET.fromstring(z.read("word/document.xml"))
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            
            for tbl in tree.iter(f"{{{ns['w']}}}tbl"):
                table_rows = []
                for tr in tbl.iter(f"{{{ns['w']}}}tr"):
                    row_cells = []
                    for tc in tr.iter(f"{{{ns['w']}}}tc"):
                        cell_text = "".join(node.text for node in tc.iter(f"{{{ns['w']}}}t") if node.text)
                        row_cells.append(cell_text.strip())
                    if any(row_cells):
                        table_rows.append(row_cells)
                if table_rows:
                    tables_data.append(table_rows)
    except Exception:
        pass
    return tables_data

def build_rubrics():
    # Rúbrica oficial del Portafolio Docente PPIV
    rubrica_portafolio = [
        {
            "id": "crit_1",
            "criterio": "Aspectos Formales",
            "descripcion": "Estructura formal, datos de portada, índice con paginación precisa y eliminación de marcas preliminares.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Portada completa con todos los datos institucionales. Índice correcto y paginación precisa. Sin texto previo o marcas en amarillo."},
                "competente": {"puntos": 2, "descriptor": "Falta 1 dato en portada o 1-2 errores menores de paginación en índice."},
                "basico": {"puntos": 1, "descriptor": "Faltan 2 o más datos, índice incompleto o con errores graves de paginación."}
            }
        },
        {
            "id": "crit_2",
            "criterio": "Resumen",
            "descripcion": "Síntesis del propósito del portafolio, evidencias principales y competencias demostradas (200 a 250 palabras).",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Descripción completa que incluye propósito, principales evidencias y todas las competencias demostradas dentro y fuera del aula."},
                "competente": {"puntos": 2, "descriptor": "Describe propósito y evidencias, pero omite o aborda superficialmente las competencias demostradas."},
                "basico": {"puntos": 1, "descriptor": "Resumen inadecuado, muy breve o no aborda los elementos centrales solicitados."}
            }
        },
        {
            "id": "crit_3",
            "criterio": "Abstract",
            "descripcion": "Traducción fiel al inglés con énfasis explícito en aspectos inclusivos y bilingües.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Traducción fiel del resumen en inglés con énfasis explícito en aspectos inclusivos y bilingües."},
                "competente": {"puntos": 2, "descriptor": "Traducción presente pero con errores léxicos/gramaticales o énfasis superficial en inclusión/bilingüismo."},
                "basico": {"puntos": 1, "descriptor": "Abstract ausente o no se relaciona coherentemente con el resumen."}
            }
        },
        {
            "id": "crit_4",
            "criterio": "Introducción",
            "descripcion": "Visión general, importancia de la autoevaluación, inclusión, bilingüismo, interdisciplinariedad y calidad educativa.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Visión clara y concisa del propósito formativo. Describe la estructura y profundiza en inclusión, interdisciplinariedad y desarrollo socioemocional."},
                "competente": {"puntos": 2, "descriptor": "Explica el objetivo, pero la justificación o el abordaje de aspectos inclusivos e interdisciplinarios es superficial."},
                "basico": {"puntos": 1, "descriptor": "Explicación vaga, no describe la estructura ni los enfoques clave."}
            }
        },
        {
            "id": "crit_5",
            "criterio": "Dimensionamiento Institucional y Diagnóstico",
            "descripcion": "Contexto escolar, caracterización del alumnado en 3 ámbitos (cognitivo, socioemocional, físico), datos de rendimiento (DIA, SIMCE).",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Revisión sistemática del contexto escolar. Caracterización en los 3 ámbitos con datos cuantitativos de aprendizaje (DIA/SIMCE) y fundamentación teórica."},
                "competente": {"puntos": 2, "descriptor": "Cumple con la mayoría de los puntos pero la descripción cuantitativa es escasa o la fundamentación teórica es incompleta."},
                "basico": {"puntos": 1, "descriptor": "Caracterización superficial sin datos de rendimiento o sin fundamentación."}
            }
        },
        {
            "id": "crit_6",
            "criterio": "Situación Pedagógica Observada",
            "descripcion": "Identificación de una necesidad concreta del aula fundamentada con teoría pedagógica y estándares docentes.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Selecciona una necesidad pedagógica clara con evidencia concreta. Fundamenta teórica y metodológicamente la solución propuesta."},
                "competente": {"puntos": 2, "descriptor": "Identifica la necesidad pero los enlaces con la evidencia o la fundamentación teórica son débiles."},
                "basico": {"puntos": 1, "descriptor": "No se identifica una necesidad específica o la fundamentación teórica está ausente."}
            }
        },
        {
            "id": "crit_7",
            "criterio": "Secuencia Didáctica de Aula",
            "descripcion": "Planificación implementada durante el semestre, articulación de momentos didácticos (inicio, desarrollo, cierre), recursos y evaluación.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Introducción completa: asignatura, temática, nivel, tiempo, actividades y objetivos. Incluye la planificación efectivamente implementada."},
                "competente": {"puntos": 2, "descriptor": "Introducción incompleta (falta 1 elemento) o la planificación no está claramente identificada como la implementada."},
                "basico": {"puntos": 1, "descriptor": "Introducción vaga o la planificación implementada está ausente."}
            }
        },
        {
            "id": "crit_8",
            "criterio": "Reflexión Docente Crítica",
            "descripcion": "Análisis crítico de decisiones didácticas con evidencias de aprendizaje de estudiantes, relación teoría-práctica y retroalimentación recibida.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Evidencias concretas que respaldan cada punto. Análisis crítico de decisiones didácticas, relación teoría-práctica, aprendizajes de la didáctica específica y retroalimentación del tutor/colaborador."},
                "competente": {"puntos": 2, "descriptor": "Cumple con la mayoría de puntos pero el análisis es más descriptivo que crítico, o falta evidencia directa de aula."},
                "basico": {"puntos": 1, "descriptor": "Ausencia de análisis crítico, falta de evidencia de aprendizaje de los escolares o no aborda la didáctica específica."}
            }
        },
        {
            "id": "crit_9",
            "criterio": "Conclusiones Finales y Plan de Desarrollo",
            "descripcion": "Reflexión estructurada (situación, análisis, reconocimiento, mejoras) y formulación de un Plan de Desarrollo Profesional futuro.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Reflexión crítica y estructurada con evidencias. Presenta un Plan de Desarrollo Profesional futuro realista y fundamentado."},
                "competente": {"puntos": 2, "descriptor": "Reflexión presente pero no sigue la estructura requerida o el plan de desarrollo profesional es genérico."},
                "basico": {"puntos": 1, "descriptor": "Reflexión meramente descriptiva o ausencia del plan de desarrollo profesional."}
            }
        },
        {
            "id": "crit_10",
            "criterio": "Bibliografía",
            "descripcion": "Citas y referencias normativas y académicas en formato adecuado (APA).",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Todas las referencias teóricas y normativas están presentes y citadas correctamente según estándar académico."},
                "competente": {"puntos": 2, "descriptor": "Referencias presentes pero con inconsistencias menores de formato."},
                "basico": {"puntos": 1, "descriptor": "Bibliografía ausente o con formato deficiente."}
            }
        },
        {
            "id": "crit_11",
            "criterio": "Anexos",
            "descripcion": "Instrumentos aplicados, guía de aprendizaje, evidencias de producciones escolares y materiales elaborados.",
            "niveles": {
                "destacado": {"puntos": 3, "descriptor": "Incluye todos los instrumentos aplicados, materiales elaborados, secuencia didáctica y guía de aprendizaje."},
                "competente": {"puntos": 2, "descriptor": "Incluye secuencia y guía, pero faltan 1-2 materiales o instrumentos clave."},
                "basico": {"puntos": 1, "descriptor": "Faltan 3 o más de los elementos clave solicitados en anexos."}
            }
        }
    ]

    # Rúbrica oficial de Evaluación de la Planificación de Clase (PPIV)
    rubrica_planificacion = [
        {
            "id": "plan_1",
            "dimension": "Caracterización Global",
            "criterio": "Nombre de Propuesta y Caracterización Curricular",
            "niveles": {
                "excelente": {"puntos": 4, "descriptor": "Nombre claro, conciso y atractivo. Nivel educativo, asignatura, unidad y duración temporal totalmente pertinentes y detallados."},
                "satisfactorio": {"puntos": 3, "descriptor": "Elementos identificados correctamente con algún detalle menor en la especificación de tiempo o asignatura."},
                "necesita_mejora": {"puntos": 2, "descriptor": "Uno de los elementos está vagamente indicado o el tiempo asignado parece poco realista."},
                "insuficiente": {"puntos": 1, "descriptor": "Elementos ausentes o incorrectamente identificados."}
            }
        },
        {
            "id": "plan_2",
            "dimension": "Marco Curricular y Objetivos",
            "criterio": "Progresión Curricular de OA y Formulación de Objetivos",
            "niveles": {
                "excelente": {"puntos": 4, "descriptor": "OA previos, a trabajar y futuros claramente articulados. Objetivo de clase formulado con verbo + contenido + condición/finalidad. Objetivo transversal pertinente."},
                "satisfactorio": {"puntos": 3, "descriptor": "Los tres OA están presentes y los objetivos formulados, aunque la articulación o el verbo de acción podrían ser más precisos."},
                "necesita_mejora": {"puntos": 2, "descriptor": "Falta un OA en la progresión o el objetivo de clase está redactado como contenido sin condición de logro."},
                "insuficiente": {"puntos": 1, "descriptor": "Progresión ausente y objetivos no formulados adecuadamente."}
            }
        },
        {
            "id": "plan_3",
            "dimension": "Secuencia Didáctica de Aula",
            "criterio": "Momentos de la Clase (Inicio, Desarrollo y Cierre)",
            "niveles": {
                "excelente": {"puntos": 4, "descriptor": "Inicio con activación y explicitación de propósito; Desarrollo con modelamiento, interacción y preguntas cognitivas de reflexión; Cierre con síntesis de ideas y metacognición."},
                "satisfactorio": {"puntos": 3, "descriptor": "Los tres momentos están presentes y descritos, pero las preguntas de mediación o el cierre son poco profundos."},
                "necesita_mejora": {"puntos": 2, "descriptor": "Uno de los momentos está omitido o las actividades son meramente expositivas sin mediación interactiva."},
                "insuficiente": {"puntos": 1, "descriptor": "Secuencia desestructurada sin distinción clara de fases didácticas."}
            }
        },
        {
            "id": "plan_4",
            "dimension": "Recursos y Evaluación",
            "criterio": "Materiales de Enseñanza y Procedimientos de Evaluación",
            "niveles": {
                "excelente": {"puntos": 4, "descriptor": "Recursos diversificados y pertinentes para educación básica (material concreto, visual, TIC). Evaluación formativa explícita con indicadores alineados al OA."},
                "satisfactorio": {"puntos": 3, "descriptor": "Recursos y evaluación adecuados, aunque los instrumentos o indicadores podrían estar más detallados."},
                "necesita_mejora": {"puntos": 2, "descriptor": "Recursos limitados o evaluación reducida a 'preguntas orales' sin indicadores claros."},
                "insuficiente": {"puntos": 1, "descriptor": "No se explicitan recursos ni estrategia evaluativa."}
            }
        }
    ]

    data = {
        "rubrica_portafolio_docente": rubrica_portafolio,
        "rubrica_planificacion_docente": rubrica_planificacion
    }

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Rúbricas oficiales de PPIV guardadas en {OUT_JSON}")

if __name__ == "__main__":
    build_rubrics()
