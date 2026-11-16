import argparse
import json
import shutil
from pathlib import Path

from PIL import Image


SOURCE = Path("C:/Users/JUNGLE/Downloads/ameath-master/gifs")
DESTINATION = Path(__file__).resolve().parents[1] / "assets" / "sprites"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--destination", type=Path, default=DESTINATION)
    parser.add_argument("--list", action="store_true", help="Inspect GIFs without extracting")
    parser.add_argument("--verify", action="store_true", help="Check existing extracted assets")
    args = parser.parse_args()

    for source in sorted(args.source.glob("*.gif")):
        with Image.open(source) as gif:
            frames = []
            for index in range(gif.n_frames):
                gif.seek(index)
                duration = gif.info.get("duration", 100)
                frames.append(duration)
                if args.verify:
                    frame = args.destination / source.stem / f"{index:04d}.png"
                    with Image.open(frame) as image:
                        assert image.mode == "RGBA" and image.size == gif.size
                        assert image.tobytes() == gif.convert("RGBA").tobytes(), frame
                elif not args.list:
                    folder = args.destination / source.stem
                    folder.mkdir(parents=True, exist_ok=True)
                    gif.convert("RGBA").save(folder / f"{index:04d}.png")

            print(source.name, gif.size, len(frames), sorted(set(frames)))
            if args.verify:
                folder = args.destination / source.stem
                assert json.loads((folder / "animation.json").read_text(encoding="utf-8")) == {
                    "size": list(gif.size), "durations_ms": frames
                }
                assert (args.destination.parent / "gifs" / source.name).read_bytes() == source.read_bytes()
            elif not args.list:
                originals = args.destination.parent / "gifs"
                originals.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, originals / source.name)
                (folder / "animation.json").write_text(
                    json.dumps({"size": gif.size, "durations_ms": frames}, indent=2) + "\n",
                    encoding="utf-8",
                )


if __name__ == "__main__":
    main()
