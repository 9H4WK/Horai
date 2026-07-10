import re
from pathlib import Path

xml_path = Path(r"X:\Searchera\docs\thesis-unpacked\word\document.xml")
if not xml_path.exists():
    raise SystemExit(f"missing {xml_path}")

xml = xml_path.read_text(encoding="utf-8")
texts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml)
joined = " ".join(texts)
joined = (
    joined.replace("&amp;", "&")
    .replace("&lt;", "<")
    .replace("&gt;", ">")
    .replace("&#x2019;", "'")
    .replace("&#x201C;", '"')
    .replace("&#x201D;", '"')
)
out = Path(r"X:\Searchera\docs\thesis-extract.txt")
out.write_text(joined, encoding="utf-8")
print(joined[:6000])
print("\n---\nwritten", out, "chars", len(joined))
