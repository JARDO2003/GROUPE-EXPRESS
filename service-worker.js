// GESTION FORMULAIRE DE COMMANDE AVEC NOTIFICATIONS
document.getElementById('order-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (cart.length === 0) {
        alert("Votre panier est vide !");
        return;
    }
    
    // Demander le nom
    const customerName = prompt("Entrez votre nom complet :", "");
    if (!customerName || customerName.trim() === "") {
        alert("❌ Veuillez entrer votre nom pour continuer");
        return;
    }
    
    // Demander le WhatsApp
    const whatsappNumber = prompt("Entrez votre numéro WhatsApp :\n(ex: 0712345678 ou +2250712345678)", "");
    if (!whatsappNumber || whatsappNumber.trim() === "") {
        alert("❌ Veuillez entrer votre numéro WhatsApp pour continuer");
        return;
    }
    
    // Validation simple du numéro
    const cleanNumber = whatsappNumber.replace(/\s+/g, '');
    if (cleanNumber.length < 8) {
        alert("❌ Numéro WhatsApp invalide. Veuillez réessayer.");
        return;
    }
    
    // Vérifier la connexion
    if (!navigator.onLine) {
        alert("❌ Pas de connexion internet\n\nVeuillez vérifier votre connexion et réessayer.");
        return;
    }
    
    const now = new Date();
    const abidjanTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Abidjan"}));
    const hour = abidjanTime.getHours();
    
    const loader = document.createElement('div');
    loader.id = 'order-loader';
    loader.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 3rem; animation: spin 1s linear infinite;">⏳</div>
            <h3 style="margin-top: 1rem;">Envoi en cours...</h3>
            <p id="loader-status" style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.7;">Préparation de votre commande...</p>
        </div>
    `;
    loader.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--surface);
        padding: 2rem 3rem;
        border-radius: 20px;
        z-index: 1002;
        box-shadow: var(--shadow-lg);
    `;
    document.body.appendChild(loader);
    
    try {
        const order = {
            customer: {
                name: customerName.trim(),
                whatsapp: cleanNumber
            },
            items: [...cart],
            total,
            timestamp: new Date().toISOString(),
            deliveryDate: hour >= 9 ? 'lendemain' : 'aujourdhui'
        };
        
        const orderCode = await window.submitOrder(order);
        
        loader.remove();
        
        if (!orderCode) {
            throw new Error("Code de commande non reçu");
        }
        
        // Sauvegarder localement
        const localOrder = {
            code: orderCode,
            order: order,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('lastSuccessfulOrder', JSON.stringify(localOrder));
        
        // Sauvegarder dans l'historique
        addCustomerOrderToList(orderCode, order);
        
        // 🔔 NOUVEAU: PROGRAMMER LA NOTIFICATION DE REMERCIEMENT
        // La notification sera envoyée 2 minutes après, même si l'utilisateur ferme le navigateur
        if (typeof window.scheduleNotification === 'function') {
            window.scheduleNotification(orderCode, customerName, 120000); // 2 minutes = 120000ms
            console.log('✅ Notification programmée pour dans 2 minutes');
        }
        
        // Vider le panier
        cart = [];
        updateCart();
        updateCartBadge();
        toggleCart();
        
        // Message de succès avec info de retrait
        const pickupMessage = document.createElement('div');
        let deliveryInfo = '';
        
        if (hour >= 0 && hour < 9) {
            deliveryInfo = `
                <div style="background: linear-gradient(135deg, #28a745, #34ce57); color: white; padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1rem;">
                    ✅ <strong>RETRAIT IMMÉDIAT</strong><br><br>
                    Veuillez passer au rez-de-chaussée<br>
                    pour le retrait de votre commande !<br><br>
                    📍 <strong>RETRAIT AU REZ-DE-CHAUSSÉE</strong>
                </div>
            `;
        } else {
            deliveryInfo = `
                <div style="background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1rem;">
                    ⏳ <strong>EN COURS DE TRAITEMENT</strong><br><br>
                    Votre commande sera prête demain<br>
                    Retrait au rez-de-chaussée<br><br>
                    📍 <strong>RETRAIT AU REZ-DE-CHAUSSÉE</strong>
                </div>
            `;
        }
        
        pickupMessage.innerHTML = `
            <button onclick="this.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.1); border: none; color: #333; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center;">×</button>
            <div style="text-align: center; margin-bottom: 1rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
                <h3>Commande ${orderCode} envoyée !</h3>
                <p style="margin-top: 0.5rem; font-size: 0.9rem;">Client: ${customerName}</p>
                <p style="font-size: 0.85rem; opacity: 0.8;">WhatsApp: ${cleanNumber}</p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem; color: #28a745;">🔔 Vous recevrez une notification dans 2 minutes</p>
            </div>
            ${deliveryInfo}
            <div style="text-align: center; font-size: 0.875rem; color: var(--on-surface-light);">
                Merci de votre confiance ! 🙏
            </div>
        `;
        pickupMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--surface);
            padding: 2rem;
            border-radius: 20px;
            z-index: 1002;
            max-width: 350px;
            box-shadow: var(--shadow-lg);
            border: 2px solid var(--primary);
        `;
        document.body.appendChild(pickupMessage);
        
        setTimeout(() => {
            if (pickupMessage.parentElement) {
                pickupMessage.remove();
            }
        }, 8000);
        
    } catch (error) {
        const loaderEl = document.getElementById('order-loader');
        if (loaderEl) loaderEl.remove();
        
        console.error('Erreur détaillée:', error);
        
        let errorMessage = "";
        let errorIcon = "❌";
        
        if (!navigator.onLine) {
            errorIcon = "📡";
            errorMessage = "Connexion internet perdue\n\n";
            errorMessage += "• Vérifiez votre connexion WiFi ou données mobiles\n";
            errorMessage += "• Réessayez dans quelques instants\n\n";
            errorMessage += "💡 Votre panier est sauvegardé !";
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
            errorIcon = "⚠️";
            errorMessage = "Connexion trop lente\n\n";
            errorMessage += "• Votre connexion internet est très faible\n";
            errorMessage += "• Rapprochez-vous d'une source WiFi\n";
            errorMessage += "• Ou réessayez avec une meilleure connexion\n\n";
            errorMessage += "💡 Votre panier est sauvegardé !";
        } else {
            errorIcon = "⚠️";
            errorMessage = "Erreur inattendue\n\n";
            errorMessage += "• Fermez et rouvrez l'application\n";
            errorMessage += "• Ou contactez le support: 07 19 98 30 44\n\n";
            errorMessage += "💡 Votre panier est sauvegardé !";
        }
        
        const errorModal = document.createElement('div');
        errorModal.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${errorIcon}</div>
                <h3 style="margin-bottom: 1rem; color: #dc3545;">Envoi échoué</h3>
                <p style="white-space: pre-line; line-height: 1.6; font-size: 0.95rem;">${errorMessage}</p>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 1.5rem; background: var(--gradient); color: white; border: none; padding: 0.75rem 2rem; border-radius: 25px; cursor: pointer; font-weight: 600;">
                    Compris
                </button>
            </div>
        `;
        errorModal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--surface);
            padding: 2rem;
            border-radius: 20px;
            z-index: 1003;
            max-width: 90%;
            width: 400px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(errorModal);
    }
});
