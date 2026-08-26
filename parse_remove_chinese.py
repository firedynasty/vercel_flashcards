import re
import sys

# CJK characters and common Chinese punctuation
CHINESE_PATTERN = re.compile(
    r'[\u4e00-\u9fff'   # CJK Unified Ideographs
    r'\u3400-\u4dbf'    # CJK Extension A
    r'\uf900-\ufaff'    # CJK Compatibility Ideographs
    r'\u3000-\u303f'    # CJK Symbols and Punctuation (。，！？、；：etc.)
    r'\uff01-\uff65'    # Fullwidth punctuation
    r']+'
)

def clean_line(line):
    if not line.strip():
        return line

    match = re.match(r'^(\d+:\d+)\s+(.*)', line)
    if not match:
        return line

    timestamp = match.group(1)
    rest = match.group(2)

    rest = CHINESE_PATTERN.sub('', rest)

    # Remove stray commas/periods left over from Chinese text
    rest = re.sub(r'^[,. ]+', '', rest)

    rest = re.sub(r'\s+', ' ', rest).strip()

    return f"{timestamp} {rest}" if rest else timestamp


def main():
    if len(sys.argv) != 3:
        print("Usage: python parse_remove_chinese.py input.txt output.txt")
        sys.exit(1)

    input_path, output_path = sys.argv[1], sys.argv[2]

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    output_lines = [clean_line(line.rstrip('\n')) for line in lines]

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    print(f"Done. Written to {output_path}")


if __name__ == '__main__':
    main()
