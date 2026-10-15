#!/usr/bin/env python3
"""
Extrae listas de cursos y estudiantes de Práctica IV (Educación Básica)
desde 'Plantilla Solicitud Matriculación ppIV.xlsx' y 'PRACTICA IV/NECESIDADES/PPIV.xlsx'.
"""

import os
import sys
import json
import zipfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATRICULA_XLSX = os.path.join(BASE_DIR, "Plantilla Solicitud Matriculación ppIV.xlsx")
PPIV_XLSX = os.path.join(BASE_DIR, "PRACTICA IV", "NECESIDADES", "PPIV.xlsx")

def read_sheet(xlsx_path):
    if not os.path.exists(xlsx_path):
        return []
    with zipfile.ZipFile(xlsx_path) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
            for elem in tree.findall(f'.//{ns}t'):
                shared.append(elem.text or '')

        sheet_name = 'xl/worksheets/sheet1.xml'
        if sheet_name not in z.namelist():
            return []
        tree = ET.fromstring(z.read(sheet_name))
        ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
        
        rows = []
        for row in tree.findall(f'.//{ns}row'):
            row_vals = []
            for c in row.findall(f'{ns}c'):
                t = c.get('t')
                v = c.find(f'{ns}v')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit():
                    idx = int(val)
                    val = shared[idx] if idx < len(shared) else ''
                row_vals.append(val.strip())
            if any(row_vals):
                rows.append(row_vals)
    return rows

def parse_rosters():
    students = {}

    # 1. Leer PPIV.xlsx con datos detallados (nombre completo, rut, mail ucsc)
    ppiv_rows = read_sheet(PPIV_XLSX)
    if ppiv_rows:
        headers = [h.lower() for h in ppiv_rows[0]]
        for r in ppiv_rows[1:]:
            if len(r) >= 5:
                # Buscar columnas
                email = ""
                name = ""
                rut = ""
                for idx, cell in enumerate(r):
                    if "@" in cell and not email:
                        email = cell.lower().strip()
                    elif ("-" in cell or len(cell) in (8, 9, 10)) and any(c.isdigit() for c in cell) and not rut and "@" not in cell:
                        rut = cell.strip()
                    elif len(cell) > 5 and not name and "@" not in cell and not any(c.isdigit() for c in cell):
                        name = cell.strip()
                
                if email and rut:
                    # Determinar mención por dominio de correo o por defecto
                    mencion = "MLYHCS" if "emlenguaje" in email else ("MMYCN" if "ebasica" in email else "MMYCN")
                    students[email] = {
                        "email": email,
                        "name": name or email.split("@")[0].replace(".", " ").title(),
                        "rut": rut,
                        "mencion": mencion,
                        "seccion": "Sección Práctica IV",
                        "fuente": "PPIV.xlsx"
                    }

    # 2. Leer Plantilla Solicitud Matriculación ppIV.xlsx
    mat_rows = read_sheet(MATRICULA_XLSX)
    for r in mat_rows:
        for cell in r:
            if "@" in cell:
                email = cell.lower().strip()
                if email not in students:
                    # Buscar si hay un RUT en la misma fila
                    rut = ""
                    for other in r:
                        if other.isdigit() and len(other) in (7, 8, 9):
                            rut = other
                            break
                    name = email.split("@")[0].replace(".", " ").title()
                    mencion = "MMYCN"
                    students[email] = {
                        "email": email,
                        "name": name,
                        "rut": rut,
                        "mencion": mencion,
                        "seccion": "Sección General",
                        "fuente": "Plantilla_Matriculacion"
                    }

    return list(students.values())

if __name__ == "__main__":
    roster = parse_rosters()
    print(json.dumps(roster, ensure_ascii=False, indent=2))
