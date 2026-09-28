import json, os

script_dir = os.path.dirname(os.path.abspath(__file__))
parts_dir = os.path.join(script_dir, "parts")
template_path = os.path.join(script_dir, "src", "templates", "goldenRatioOva.json")
output_path = os.path.join(script_dir, "index.html")

# Also target the public folder in the root Vite project
project_root = os.path.abspath(os.path.join(script_dir, ".."))
public_ova_dir = os.path.join(project_root, "public", "ova-studio")
public_output_path = os.path.join(public_ova_dir, "index.html")

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

head = read_file(os.path.join(parts_dir, "head_and_styles.html"))
navbar = read_file(os.path.join(parts_dir, "navbar.html"))
editor_ui = read_file(os.path.join(parts_dir, "editor_ui.html"))
viewer_ui = read_file(os.path.join(parts_dir, "viewer_ui.html"))
modals = read_file(os.path.join(parts_dir, "modals.html"))
toasts = read_file(os.path.join(parts_dir, "toast_and_dialogs.html"))

app_core = read_file(os.path.join(parts_dir, "app_core.js"))
app_editor = read_file(os.path.join(parts_dir, "app_editor.js"))
app_canva = read_file(os.path.join(parts_dir, "app_canva_cover.js"))
app_blocks = read_file(os.path.join(parts_dir, "app_blocks_editor.js"))
app_viewer = read_file(os.path.join(parts_dir, "app_viewer_and_interactive.js"))
app_mutations = read_file(os.path.join(parts_dir, "app_mutations_and_export.js"))

ova_json = read_file(template_path)

script_open = '  <script id="appInitScript">\n    window.DEFAULT_GOLDEN_RATIO_OVA = ' + ova_json + ';\n\n'
scripts = app_core + "\n" + app_editor + "\n" + app_canva + "\n" + app_blocks + "\n" + app_viewer + "\n" + app_mutations
script_close = '''
    // Bootstrapping
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  </script>
</body>
</html>
'''

full_html = (
    head + "\n" +
    navbar + "\n" +
    editor_ui + "\n" +
    viewer_ui + "\n" +
    modals + "\n" +
    toasts + "\n" +
    script_open +
    scripts +
    script_close
)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(full_html)

os.makedirs(public_ova_dir, exist_ok=True)
with open(public_output_path, "w", encoding="utf-8") as f:
    f.write(full_html)

# Also ensure tailwind.min.css is synchronized across all relevant targets
local_css = os.path.join(script_dir, "tailwind.min.css")
public_css = os.path.join(public_ova_dir, "tailwind.min.css")
root_public_css = os.path.join(project_root, "public", "tailwind.min.css")

import shutil
src_css = None
if os.path.exists(public_css):
    src_css = public_css
elif os.path.exists(local_css):
    src_css = local_css

def safe_copy(src, dst):
    if src and os.path.exists(src) and os.path.abspath(src) != os.path.abspath(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)

if src_css:
    safe_copy(src_css, local_css)
    safe_copy(src_css, public_css)
    safe_copy(src_css, root_public_css)

print("Rebuilt polished index.html successfully! Size:", len(full_html), "bytes")
print("Saved to:", output_path)
print("Saved to:", public_output_path)
