document.addEventListener('DOMContentLoaded', () => {
    const carousels = document.querySelectorAll('.carousel-container-js');

    carousels.forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        const prevButton = carousel.querySelector('.carousel-button.prev');
        const nextButton = carousel.querySelector('.carousel-button.next');

        if (!track) return;

        const cards = Array.from(track.children);
        let currentIndex = 0;

        function getCardsPerView() {
            if (window.innerWidth >= 1024) return 3;
            if (window.innerWidth >= 768) return 2;
            return 1;
        }

        function updateCarousel() {
            const cardsPerView = getCardsPerView();
            // Calculate width based on the track's visible width
            const cardWidth = track.parentElement.clientWidth / cardsPerView;

            // Ensure index is within bounds
            const maxIndex = Math.max(0, cards.length - cardsPerView);
            // Allow looping for auto-play, but clamp for manual if needed
            // For now, just clamp to be safe, but we will handle loop in moveNext
            if (currentIndex > maxIndex) currentIndex = 0;

            const translateX = -(currentIndex * (100 / cardsPerView));
            track.style.transform = `translateX(${translateX}%)`;

            // Update button states if they exist
            if (prevButton) {
                prevButton.disabled = currentIndex === 0;
                prevButton.style.opacity = prevButton.disabled ? '0.5' : '1';
                prevButton.style.cursor = prevButton.disabled ? 'default' : 'pointer';
            }
            if (nextButton) {
                nextButton.disabled = currentIndex >= maxIndex;
                nextButton.style.opacity = nextButton.disabled ? '0.5' : '1';
                nextButton.style.cursor = nextButton.disabled ? 'default' : 'pointer';
            }
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const cardsPerView = getCardsPerView();
                const maxIndex = Math.max(0, cards.length - cardsPerView);
                if (currentIndex < maxIndex) {
                    currentIndex++;
                    updateCarousel();
                }
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                }
            });
        }

        // Auto Play
        function moveNext() {
            const cardsPerView = getCardsPerView();
            const maxIndex = Math.max(0, cards.length - cardsPerView);
            if (currentIndex < maxIndex) {
                currentIndex++;
            } else {
                currentIndex = 0; // Loop back to start
            }
            updateCarousel();
        }

        let autoPlayTimer = setInterval(moveNext, 3000);

        // Pause on hover
        carousel.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
        carousel.addEventListener('mouseleave', () => {
            clearInterval(autoPlayTimer);
            autoPlayTimer = setInterval(moveNext, 3000);
        });

        // Handle resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateCarousel, 100);
        });

        // Initial setup
        updateCarousel();
    });
});
