import csv
import json
import pathlib
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

PUBLIC_DIR = pathlib.Path("public")
CSV_PATH = PUBLIC_DIR / "characters.csv"
OUTPUT_JSON_PATH = PUBLIC_DIR / "characters.json"

STANDING_DIR = PUBLIC_DIR / "char"
CUTSCENES_DIR = PUBLIC_DIR / "cutscenes"
DATINGS_DIR = PUBLIC_DIR / "datings"
THUMBNAIL_IMG_DIR = PUBLIC_DIR / "illust_inven_char"
SKILL_IMG_DIR = PUBLIC_DIR / "illust_skill_char"

DATING_ID_MAP = {
    "003303": "1",
    "003402": "2",
    "003203": "3",
    "001106": "4",
    "060802": "5",
    "067603": "6",
    "000296": "7",
}

def find_asset_file(directory: pathlib.Path, name_pattern: str) -> str | None:
    try:
        found_file = next(directory.glob(name_pattern))
        return found_file.relative_to(PUBLIC_DIR).as_posix()
    except StopIteration:
        logging.warning(f"No file found in '{directory}' matching '{name_pattern}'.")
        return None

def get_spine_data(base_path: pathlib.Path, folder_name: str) -> dict | None:
    animation_folder = base_path / folder_name
    if not animation_folder.is_dir():
        return None

    try:
        skel_file = next(animation_folder.glob("*.skel"))
        atlas_file = next(animation_folder.glob("*.atlas"))
        
        png_files = [png.relative_to(base_path).as_posix() for png in animation_folder.glob("*.png")]

        return {
            "skeleton": skel_file.relative_to(base_path).as_posix(),
            "atlas": atlas_file.relative_to(base_path).as_posix(),
            "images": png_files,
        }
    except StopIteration:
        logging.warning(f"Animation folder '{animation_folder.name}' is incomplete (missing .skel or .atlas).")
        return None

def main():
    try:
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            characters_base_data = list(csv.DictReader(f))
    except FileNotFoundError:
        logging.error(f"FATAL: Character CSV not found at '{CSV_PATH}'. Exiting.")
        return

    processed_characters = []
    for char_data in characters_base_data:
        char_id = char_data.get("id")
        if not char_id:
            logging.warning(f"Skipping a row in '{CSV_PATH}' due to missing ID.")
            continue

        char_name = char_data.get("character", "Unknown")
        costume_name = char_data.get("costume", "Unknown")
        logging.info(f"Processing: {char_name} - {costume_name} (ID: {char_id})")

        thumbnail_image = find_asset_file(THUMBNAIL_IMG_DIR, f"*char{char_id}*.*")
        skill_image = find_asset_file(SKILL_IMG_DIR, f"*char{char_id}*.*")

        standing_data = get_spine_data(STANDING_DIR, f"char{char_id}")
        cutscene_data = get_spine_data(CUTSCENES_DIR, f"cutscene_char{char_id}")
        
        dating_data = None
        dating_story_id = DATING_ID_MAP.get(char_id)
        if dating_story_id:
            dating_data = get_spine_data(DATINGS_DIR, f"illust_dating{dating_story_id}")

        processed_characters.append({
            "id": char_id,
            "character": char_name,
            "costume": costume_name,
            "character_image": thumbnail_image,
            "skill_preview_image": skill_image,
            "standing": standing_data,
            "cutscene": cutscene_data,
            "dating": dating_data,
        })

    final_output = {"characters": processed_characters}
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=4)

    logging.info(f"Processed {len(processed_characters)} characters.")
    logging.info(f"Output written to '{OUTPUT_JSON_PATH}'.")


if __name__ == "__main__":
    main()