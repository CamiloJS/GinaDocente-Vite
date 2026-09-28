import json, os

ova_data = {
  "id": "ova-golden-ratio-01",
  "version": "1.0.0",
  "title": "El número de oro: entre lo divino y lo humano",
  "subject": "Matemáticas y Geometría",
  "description": "Objeto Virtual de Aprendizaje interactivo sobre la sucesión de Fibonacci, la proporción divina y el número de oro.",
  "author": "CIER Sur - Universidad del Valle / EnglishTech",
  "createdAt": "2026-09-03",
  "updatedAt": "2026-09-03",
  "theme": {
    "primaryColor": "#AD3333",
    "accentColor": "#d97706",
    "isDarkMode": True
  },
  "cover": {
    "title": "El número de oro: entre lo divino y lo humano",
    "subtitle": "Descubre las proporciones áureas, la sucesión de Fibonacci y su presencia en el arte y la naturaleza.",
    "badgeText": "OBJETO VIRTUAL DE APRENDIZAJE • MATEMÁTICAS",
    "institution": "Universidad de Pamplona & CIER Sur",
    "authorName": "Prof. César Augusto Delgado García",
    "backgroundImage": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80",
    "backgroundColor": "#0f172a",
    "textColor": "#ffffff",
    "overlayOpacity": 0.75,
    "startButtonText": "Comenzar Recorrido",
    "showEnglishTechBranding": True
  },
  "pages": []
}

out_dir = r"C:\Users\Equipo\.gemini\antigravity\scratch\englishtech-ova-editor\src\templates"
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "goldenRatioOva.json"), "w", encoding="utf-8") as f:
    json.dump(ova_data, f, ensure_ascii=False, indent=2)
print("Base template created successfully")
