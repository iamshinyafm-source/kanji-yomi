#!/usr/bin/env python3
"""KanjiVG の配布ファイルから、questions.csv の出題語に使われている漢字の書き順SVGだけを取り出して kanjivg/ に置く。

使い方（アプリのフォルダで実行）:
    python tools/extract_kanjivg.py ダウンロードしたKanjiVGのzip
    python tools/extract_kanjivg.py 展開したKanjiVGのフォルダ

KanjiVG の入手先: https://github.com/KanjiVG/kanjivg/releases
（"kanjivg-日付-main.zip" のような名前のファイル）

KanjiVG は Ulrich Apel 氏の作品で、CC BY-SA 3.0 で公開されています。
"""
import csv
import os
import sys
import zipfile

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUESTIONS = os.path.join(APP_DIR, 'questions.csv')
OUT_DIR = os.path.join(APP_DIR, 'kanjivg')


def is_kanji(c):
    o = ord(c)
    return 0x3400 <= o <= 0x4DBF or 0x4E00 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF


def needed_kanji():
    with open(QUESTIONS, encoding='utf-8-sig', newline='') as f:
        rows = csv.DictReader(f)
        found = []
        for r in rows:
            for c in (r.get('出題語') or ''):
                if is_kanji(c) and c not in found:
                    found.append(c)
    return found


def name_of(c):
    return format(ord(c), '05x') + '.svg'


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    kanji = needed_kanji()
    want = {name_of(c): c for c in kanji}
    os.makedirs(OUT_DIR, exist_ok=True)
    got = set()

    if os.path.isdir(src):
        for root, _, files in os.walk(src):
            for fn in files:
                if fn in want and fn not in got:
                    with open(os.path.join(root, fn), 'rb') as f:
                        data = f.read()
                    with open(os.path.join(OUT_DIR, fn), 'wb') as f:
                        f.write(data)
                    got.add(fn)
    else:
        with zipfile.ZipFile(src) as z:
            for info in z.infolist():
                fn = info.filename.rsplit('/', 1)[-1]
                if fn in want and fn not in got:
                    with open(os.path.join(OUT_DIR, fn), 'wb') as f:
                        f.write(z.read(info))
                    got.add(fn)

    missing = [want[n] for n in want if n not in got]
    print(f'必要な漢字: {len(want)}字 / 取り出し: {len(got)}字 → {OUT_DIR}')
    if missing:
        print('見つからなかった漢字（ポップアップでは「書き順データがありません」と表示されます）:', ''.join(missing))


if __name__ == '__main__':
    main()
