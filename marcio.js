     // Créer les particules
        const particlesContainer = document.getElementById('particles');
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 4 + 's';
            particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
            particlesContainer.appendChild(particle);
        }

        // Compteur de progression
        let progress = 0;
        const counterElement = document.getElementById('progressCounter');
        const counterInterval = setInterval(() => {
            progress += 1;
            counterElement.textContent = progress + '%';
            if (progress >= 100) {
                clearInterval(counterInterval);
            }
        }, 60);

        // Créer les lignes de route pour le contenu principal
        const routeContainer = document.getElementById('deliveryRoute');
        for (let i = 0; i < 6; i++) {
            const route = document.createElement('div');
            route.className = 'route-line';
            route.style.left = (10 + i * 180) + 'px';
            route.style.animationDelay = (i * 1.3) + 's';
            routeContainer.appendChild(route);
        }

        // Créer les colis flottants
        const packagesContainer = document.getElementById('floatingPackages');
        for (let i = 0; i < 8; i++) {
            const pkg = document.createElement('div');
            pkg.className = 'floating-package';
            pkg.style.left = Math.random() * 90 + '%';
            pkg.style.top = Math.random() * 90 + '%';
            pkg.style.animationDelay = Math.random() * 5 + 's';
            pkg.style.animationDuration = (Math.random() * 8 + 10) + 's';
            packagesContainer.appendChild(pkg);
        }

        // Transition de l'intro vers le contenu principal
        setTimeout(() => {
            const introContainer = document.getElementById('introContainer');
            const mainContent = document.getElementById('mainContent');
            
            introContainer.classList.add('fade-out');
            
            setTimeout(() => {
                introContainer.style.display = 'none';
                mainContent.classList.add('active');
            }, 1500);
        }, 7000);

        // Effet parallaxe sur les décorations
        document.addEventListener('mousemove', (e) => {
            const corners = document.querySelectorAll('.corner-decoration');
            const x = e.clientX / window.innerWidth - 0.5;
            const y = e.clientY / window.innerHeight - 0.5;
            
            corners.forEach((corner, index) => {
                const speed = 15;
                const xMove = x * speed * (index === 0 ? 1 : -1);
                const yMove = y * speed * (index === 0 ? 1 : -1);
                corner.style.transform = `translate(${xMove}px, ${yMove}px)`;
            });
        });

        // Animation avancée des boutons
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('mouseenter', function() {
                this.style.letterSpacing = '3px';
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.letterSpacing = '2px';
            });
        });

        // Gestion du logo
        const logoImage = document.getElementById('logoImage');
        logoImage.addEventListener('load', function() {
            document.querySelector('.logo-fallback').style.display = 'none';
        });
