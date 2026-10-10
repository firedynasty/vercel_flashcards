            // Control buttons
            document.getElementById('speakRevealBtn').addEventListener('click', goBackAndSpeak);
            document.getElementById('nextSpeakBtn').addEventListener('click', nextAndSpeak);

            // Grab from dictate input (preferred) or clipboard fallback
            document.getElementById('grabClipBtn').addEventListener('click', async () => {
                if (allCards.length === 0) return;
                const input = document.getElementById('dictateInput');
                const inputText = input.value.trim();
                if (inputText) {
                    userAnswers[currentIndex] = inputText;
                    input.value = '';
                } else {
                    try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText && clipText.trim()) {
                            userAnswers[currentIndex] = clipText.trim();
                        }
                    } catch (err) {
                        console.error('Clipboard read failed:', err);
                    }
                }
                navigate(1);
            });

            // Clear dictate input
            document.getElementById('clearDictateBtn').addEventListener('click', () => {
                document.getElementById('dictateInput').value = '';
            });

            // Export all answers to clipboard for AI grading
            document.getElementById('exportAnswersBtn').addEventListener('click', async () => {
                if (allCards.length === 0) return;
                const lines = [];
                lines.push('Grade my answers for accuracy:\n');
                allCards.forEach((card, i) => {
                    const q = card.chinese || '(no prompt)';
                    const expected = card.english || '';
                    const answer = userAnswers[i] || '(no answer)';
                    lines.push(`Q${i+1}: ${q}`);
                    if (expected) lines.push(`Expected: ${expected}`);
                    lines.push(`My Answer: ${answer}`);
                    lines.push('');
                });
                const output = lines.join('\n');
                try {
                    await navigator.clipboard.writeText(output);
                    alert('Answers copied to clipboard! Paste into AI chat for grading.');
                } catch (err) {
                    console.error('Clipboard write failed:', err);
                    alert('Could not copy. Check clipboard permissions.');
                }
            });
