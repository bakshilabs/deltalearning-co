"""Generate site photography with gpt-image-2. Usage: OPENAI_API_KEY=... python3 -I tools/gen-photos.py OUTDIR [name ...]  (then resize to 1600 and 800 wide into img/photo/)"""
import base64, json, os, sys, urllib.request, concurrent.futures as cf

STYLE = (
    "Candid documentary photograph, natural light, shot on a 35mm lens, shallow depth of field, "
    "realistic skin and textures, warm but neutral colour grade, editorial quality for an education "
    "technology company website. Children are around 9 to 12 years old, a natural mix of ethnicities, "
    "in ordinary everyday clothes, engaged and thinking, not posing or looking at the camera. "
    "Any screens show soft abstract coloured shapes and simple cards with no legible text. "
    "No logos, no brand names, no watermarks, no readable writing anywhere."
)

SHOTS = {
    "decide": (
        "Two children at a classroom table in a UK primary school lean over a tablet together. One points at "
        "the screen, mid-sentence, making a case; the other has a hand on their chin, weighing it up. "
        "An adult facilitator crouches at the end of the table, listening rather than telling. Pencils and a "
        "paper planning sheet on the table. Big windows, daylight.",
        "2400x1600",
    ),
    "nature": (
        "An outdoor classroom at a woodland environmental education centre in England. Three children sit at a "
        "rough wooden picnic table under trees, sharing a tablet in a rugged case. One holds a leaf up to compare "
        "it with the screen. An educator in a green fleece stands behind them. Soft overcast light, moss and ferns.",
        "2400x1600",
    ),
    "stem": (
        "An after-school STEM club in a bright school science room. Three children gather around a laptop next to "
        "a small cardboard wind turbine model, a breadboard and coloured tape. One child adjusts the model while "
        "another reads the screen and the third makes a note. Late-afternoon light.",
        "2400x1600",
    ),
    "camp": (
        "A summer holiday camp in a school sports hall in England. A small group of children in matching plain "
        "teal camp t-shirts huddle around a tablet on a gym bench, two of them laughing at a result, one about "
        "to tap a choice. A young camp leader with a lanyard kneels beside them. Energetic, bright, cheerful.",
        "2400x1600",
    ),
    "museum": (
        "A family-learning session in a natural history museum gallery. Two children stand at a tablet on a slim "
        "stand in front of a large fossil skeleton display, one pointing from the screen to the fossil. A museum "
        "learning officer with a plain lanyard explains beside them. Warm gallery lighting, stone floor, glass cases.",
        "2400x1600",
    ),
    "facilitator": (
        "A facilitator leads a small group of six children in a primary school classroom. She stands beside a large "
        "interactive screen showing three big coloured choice cards with no text, asking the group a question. "
        "Several children raise hands eagerly, two others discuss with each other. Seen from the back of the room, "
        "over the children's shoulders. Daylight.",
        "2400x1600",
    ),
}


def gen(name, out):
    prompt, size = SHOTS[name]
    body = json.dumps({
        "model": "gpt-image-2", "prompt": prompt + " " + STYLE, "size": size,
        "quality": "high", "n": 1, "output_format": "jpeg", "output_compression": 92,
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations", data=body,
        headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        return name, "HTTP %s: %s" % (e.code, e.read().decode()[:400])
    path = os.path.join(out, name + ".jpg")
    with open(path, "wb") as f:
        f.write(base64.b64decode(data["data"][0]["b64_json"]))
    return name, path


if __name__ == "__main__":
    out = sys.argv[1]
    names = sys.argv[2:] or list(SHOTS)
    os.makedirs(out, exist_ok=True)
    with cf.ThreadPoolExecutor(6) as ex:
        for name, res in ex.map(lambda n: gen(n, out), names):
            print(name, res, flush=True)
