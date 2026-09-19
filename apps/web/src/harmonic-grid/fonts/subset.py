"""Build the sharp/flat text font: python subset.py path/to/BravuraText.otf.

Requires fonttools==4.59.0 and brotli==1.1.0 for asset generation only.
"""

from pathlib import Path
import sys

from fontTools import subset
from fontTools.ttLib import TTFont


font = TTFont(sys.argv[1])
options = subset.Options()
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
options.name_legacy = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=[0x266D, 0x266F])
subsetter.subset(font)

# The OFL reserves the upstream font name. Rename this modified subset.
names = {
    1: "Rechorder Accidentals",
    2: "Regular",
    3: "RechorderAccidentals-1.0",
    4: "Rechorder Accidentals",
    6: "RechorderAccidentals",
    16: "Rechorder Accidentals",
    17: "Regular",
}
for record in font["name"].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
license_text = Path(__file__).with_name("OFL.txt").read_text(encoding="utf-8")
font["name"].setName(license_text, 13, 3, 1, 0x409)
font["CFF "].cff.fontNames = ["RechorderAccidentals"]
top = font["CFF "].cff.topDictIndex[0]
top.FamilyName = "Rechorder Accidentals"
top.FullName = "Rechorder Accidentals"
font.flavor = "woff2"
font.save(Path(__file__).with_name("rechorder-accidentals.woff2"))
