// === Gestion du profil utilisateur (localStorage) ===
    let userProfile = JSON.parse(localStorage.getItem('userProfile') || 'null');
    function showProfileForm() {
        document.getElementById('profile-overlay').style.display = 'flex';
        if (userProfile) {
            document.getElementById('profile-lastname').value = userProfile.lastname || '';
            document.getElementById('profile-firstname').value = userProfile.firstname || '';
            document.getElementById('profile-email').value = userProfile.email || '';
            if (userProfile.photo) {
                document.getElementById('profile-photo-preview').src = userProfile.photo;
                document.getElementById('profile-photo-preview').style.display = "inline";
            }
            if (userProfile.bg) {
                document.getElementById('profile-bg-preview').src = userProfile.bg;
                document.getElementById('profile-bg-preview').style.display = "inline";
            }
        }
    }
    function hideProfileForm() {
        document.getElementById('profile-overlay').style.display = 'none';
    }
    document.getElementById('profile-btn').onclick = showProfileForm;
    document.getElementById('profile-overlay').addEventListener('click', function(e){
        if(e.target === this) hideProfileForm();
    });
    document.getElementById('profile-photo').addEventListener('change', function(){
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('profile-photo-preview').src = e.target.result;
                document.getElementById('profile-photo-preview').style.display = "inline";
            };
            reader.readAsDataURL(file);
        }
    });
    document.getElementById('profile-bg').addEventListener('change', function(){
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('profile-bg-preview').src = e.target.result;
                document.getElementById('profile-bg-preview').style.display = "inline";
            };
            reader.readAsDataURL(file);
        }
    });
    document.getElementById('profile-form').onsubmit = function(e) {
        e.preventDefault();
        const photo = document.getElementById('profile-photo-preview').src || null;
        const bg = document.getElementById('profile-bg-preview').src || null;
        userProfile = {
            lastname: document.getElementById('profile-lastname').value,
            firstname: document.getElementById('profile-firstname').value,
            email: document.getElementById('profile-email').value,
            photo: (photo && photo.startsWith('data')) ? photo : null,
            bg: (bg && bg.startsWith('data')) ? bg : null
        };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        hideProfileForm();
        applyUserProfile();
        fillOrderFormWithProfile();
    };
    function applyUserProfile() {
        if (userProfile) {
            if (userProfile.bg) {
                document.body.style.backgroundImage = `url('${userProfile.bg}')`;
            } else {
                document.body.style.backgroundImage = `url('image/WhatsApp Image 2025-06-10 à 23.52.24_467459e6.jpg')`;
            }
            // Affiche la photo dans le bouton profil
            if (userProfile.photo) {
                document.getElementById('profile-btn').innerHTML = `<img src="${userProfile.photo}" style="width:24px; height:24px; border-radius:50%; vertical-align:middle; margin-right:7px;"> Mon profil`;
            } else {
                document.getElementById('profile-btn').innerHTML = '👤 Mon profil';
            }
        }
    }
    function fillOrderFormWithProfile() {
        if (userProfile) {
            document.getElementById('name').value = (userProfile.firstname || "") + ' ' + (userProfile.lastname || "");
        }
    }
    window.addEventListener('DOMContentLoaded', function() {
        if (!userProfile) {
            showProfileForm();
        } else {
            applyUserProfile();
            fillOrderFormWithProfile();
        }
    });



    // Variables pour stocker les données du profil
        let profileData = {
            lastname: '',
            firstname: '',
            email: '',
            photo: null,
            background: null
        };

        // Fonction pour ouvrir le profil
        function openProfile() {
            document.getElementById('profile-overlay').style.display = 'flex';
            // Charger les données sauvegardées
            loadProfile();
        }

        // Fonction pour fermer le profil
        function closeProfile(event) {
            if (event && event.target !== event.currentTarget) return;
            document.getElementById('profile-overlay').style.display = 'none';
        }

        // Fonction pour changer d'onglet
        function showTab(tabId) {
            // Cacher tous les onglets
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Désactiver tous les boutons d'onglet
            const tabButtons = document.querySelectorAll('.profile-tab');
            tabButtons.forEach(button => button.classList.remove('active'));
            
            // Afficher l'onglet sélectionné
            document.getElementById(tabId).classList.add('active');
            
            // Activer le bouton correspondant
            event.target.classList.add('active');
        }

        // Fonction pour sauvegarder le profil
        function saveProfile(event) {
            event.preventDefault();
            
            // Récupérer les données du formulaire
            profileData.lastname = document.getElementById('profile-lastname').value;
            profileData.firstname = document.getElementById('profile-firstname').value;
            profileData.email = document.getElementById('profile-email').value;
            
            // Gérer les fichiers
            const photoFile = document.getElementById('profile-photo').files[0];
            const bgFile = document.getElementById('profile-bg').files[0];
            
            if (photoFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileData.photo = e.target.result;
                };
                reader.readAsDataURL(photoFile);
            }
            
            if (bgFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileData.background = e.target.result;
                    document.body.style.backgroundImage = `url(${e.target.result})`;
                };
                reader.readAsDataURL(bgFile);
            }
            
            // Sauvegarder dans le localStorage (simulation)
            localStorage.setItem('profileData', JSON.stringify(profileData));
            
            // Mettre à jour le bouton profil
            updateProfileButton();
            
            alert('✅ Profil sauvegardé avec succès !');
            closeProfile();
        }

        // Fonction pour charger le profil
        function loadProfile() {
            const saved = localStorage.getItem('profileData');
            if (saved) {
                profileData = JSON.parse(saved);
                document.getElementById('profile-lastname').value = profileData.lastname || '';
                document.getElementById('profile-firstname').value = profileData.firstname || '';
                document.getElementById('profile-email').value = profileData.email || '';
                
                if (profileData.background) {
                    document.body.style.backgroundImage = `url(${profileData.background})`;
                }
                
                updateProfileButton();
            }
        }

        // Fonction pour mettre à jour le bouton profil
        function updateProfileButton() {
            const profileBtn = document.getElementById('profile-btn');
            if (profileData.firstname && profileData.lastname) {
                // Masquer les noms comme demandé, juste afficher l'icône et "Mon Profil"
                profileBtn.innerHTML = '<span>👤</span><span>Mon Profil</span>';
            }
        }

        // Fonction pour partager sur WhatsApp
        function shareOnWhatsApp() {
            const message = encodeURIComponent("🍽️ Découvrez LOKO EXPRESS - Les meilleurs repas universitaires ! Rejoignez-nous sur : https://loko-blush.vercel.app/");
            window.open(`https://wa.me/?text=${message}`, '_blank');
        }

        // Fonction pour partager sur Facebook
        function shareOnFacebook() {
            const url = encodeURIComponent("https://loko-blush.vercel.app/");
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        }

        // Charger le profil au démarrage
        window.addEventListener('DOMContentLoaded', function() {
            loadProfile();
        });

        // Fermer le profil avec la touche Échap
        document.addEventListener('keydown', function(event) { if (event.key === 'Escape') {
                closeProfile({ target: document.getElementById('profile-overlay'), currentTarget: document.getElementById('profile-overlay') });
            }
        });
    