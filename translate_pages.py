import re
import os
import json
import time
from deep_translator import GoogleTranslator

# File path
I18N_PATH = './src/i18n.js'

# Translation mapping
LANG_MAP = {
    'ru': 'ru',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'zh': 'zh-CN',
    'ja': 'ja',
    'ar': 'ar',
    'pt': 'pt',
    'it': 'it',
    'hi': 'hi',
    'ko': 'ko',
    'id': 'id',
    'tr': 'tr'
}

def sanitize_translation(text):
    text = re.sub(r'\{\s*\{\s*(\w+)\s*\}\s*\}', r'{{\1}}', text)
    text = re.sub(r'\{\{\s*(\w+)\s*\}\}', r'{{\1}}', text)
    text = text.replace('"', '\\"')
    return text


def translate_batch(translator, texts):
    translated = []
    batch_size = 50
    for i in range(0, len(texts), batch_size):
        chunk = texts[i:i + batch_size]
        print(f"  Translating chunk {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}...")
        try:
            res = translator.translate_batch(chunk)
            translated.extend([sanitize_translation(t) for t in res])
            time.sleep(0.5)
        except Exception as e:
            print(f"  Error in batch: {e}. Falling back to single translations...")
            for text in chunk:
                try:
                    res = translator.translate(text)
                    translated.append(sanitize_translation(res))
                    time.sleep(0.3)
                except Exception as ex:
                    print(f"    Failed: {ex}")
                    translated.append(sanitize_translation(text))
    return translated


def main():
    print(f"Reading {I18N_PATH}...")
    if not os.path.exists(I18N_PATH):
        print(f"Error: {I18N_PATH} not found.")
        return

    with open(I18N_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse commonKeys
    common_match = re.search(r'const commonKeys = \{([\s\S]*?)\};\s*\nconst resources', content)
    if not common_match:
        print("Could not find commonKeys block!")
        return

    common_text = common_match.group(1)
    common_pairs = re.findall(r'\"([^\"]+)\"\s*:\s*\"((?:[^\"\\\\]|\\\\.)*)\"', common_text)
    common_keys_dict = {k: v for k, v in common_pairs}
    print(f"Total keys in commonKeys: {len(common_keys_dict)}")

    # Parse language blocks
    pattern = r'([a-z]{2})\s*:\s*\{\s*translation\s*:\s*\{\s*\.\.\.commonKeys\s*,?([\s\S]*?)\}\s*\}'
    lang_blocks = list(re.finditer(pattern, content))

    new_content = content

    for match in lang_blocks:
        lang = match.group(1)
        body = match.group(2)

        if lang not in LANG_MAP:
            print(f"Skipping {lang} (not in LANG_MAP)")
            continue

        existing_keys = set(re.findall(r'\"([^\"]+)\"\s*:', body))
        missing_keys = [k for k in common_keys_dict.keys() if k not in existing_keys]

        print(f"\nLanguage: {lang} | Existing: {len(existing_keys)} | Missing: {len(missing_keys)}")

        if not missing_keys:
            print(f"  ✓ All keys already translated for {lang}")
            continue

        print(f"  Starting translation for {lang} ({len(missing_keys)} keys)...")

        # Translate in batches and save incrementally
        source_texts = [common_keys_dict[k] for k in missing_keys]
        target_lang = LANG_MAP[lang]
        translator = GoogleTranslator(source='en', target=target_lang)

        translated_texts = translate_batch(translator, source_texts)

        # Build insertion
        insertion_parts = [f'      "{k}": "{v}"' for k, v in zip(missing_keys, translated_texts)]
        insertion_str = ",\n" + ",\n".join(insertion_parts)

        # Update content
        full_match_str = match.group(0)
        cleaned_body = body.rstrip()
        new_body = cleaned_body + insertion_str + "\n    "
        new_full_match_str = full_match_str.replace(body, new_body)

        new_content = new_content.replace(full_match_str, new_full_match_str)

        # === SAVE TO FILE AFTER EACH LANGUAGE ===
        with open(I18N_PATH, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"  ✅ Successfully saved translations for {lang} ({len(missing_keys)} keys added)\n")

    print("All languages processed. Done!")


if __name__ == '__main__':
    main()