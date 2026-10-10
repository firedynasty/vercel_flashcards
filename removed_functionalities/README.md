# Removed from flashcards.html

Taken out to simplify the main page. Each file holds the exact removed code.

- html_dictate_row_and_language_selector.html — answer box (Grab/Clr/Export) + Language/speed/Reveal/Speak bar. Was above `<!-- Flashcard Section -->`.
- html_hint_line.html — the "Back and Next & Speak..." hint under the title.
- css_dictate_row.css — styles for the answer box (before `/* Language Selector */`).
- js_focus_on_load.js — focused the answer box on DOMContentLoaded.
- js_back_next_speak_grab_clear_export_handlers.js — Back / Next & Speak / Grab / Clr / Export handlers (`userAnswers` var still exists).
- js_auto_reveal_auto_speak_toggles.js — Reveal/Speak toggle buttons (saved in localStorage; `autoReveal`/`autoSpeak` now stay false).

`speakChinese()` now falls back to Mandarin at 1x when the selectors are missing.
To restore: paste the HTML back, the CSS back, and the JS back inside the DOMContentLoaded handler.
