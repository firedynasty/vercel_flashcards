            // Auto-reveal and auto-speak toggle buttons
            const autoRevealBtn = document.getElementById('autoRevealBtn');
            const autoSpeakBtn = document.getElementById('autoSpeakBtn');

            // Load saved preferences
            if (localStorage.getItem('flashcard-autoReveal') === 'true') {
                autoReveal = true;
                autoRevealBtn.classList.add('reveal-active');
            }
            if (localStorage.getItem('flashcard-autoSpeak') === 'true') {
                autoSpeak = true;
                autoSpeakBtn.classList.add('speak-active');
            }

            autoRevealBtn.addEventListener('click', function() {
                autoReveal = !autoReveal;
                this.classList.toggle('reveal-active', autoReveal);
                localStorage.setItem('flashcard-autoReveal', autoReveal.toString());
                updateDisplay();
            });

            autoSpeakBtn.addEventListener('click', function() {
                autoSpeak = !autoSpeak;
                this.classList.toggle('speak-active', autoSpeak);
                localStorage.setItem('flashcard-autoSpeak', autoSpeak.toString());
            });

