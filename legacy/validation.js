export const ValidationSystem = {
    CONFIG: {
        retryAttempts: 3,
        retryDelay: 1000,
        validationDelay: 300
    },

    getProductInfo() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            return {
                productCode: urlParams.get('id'),
                localeData: urlParams.get('loc_data'),
                currentUrl: window.location.href
            };
        } catch (error) {
            console.error('Erreur getProductInfo:', error);
            throw error;
        }
    },

    simulateClick(element) {
        if (!element) {
            throw new Error('Aucun élément fourni pour le clic');
        }

        const wasHidden = window.getComputedStyle(element).display === 'none';
        const originalDisplay = element.style.display;

        if (wasHidden) {
            element.style.display = 'block';
        }

        try {
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(clickEvent);
            console.log('✅ Clic simulé avec succès');
        } finally {
            if (wasHidden) {
                element.style.display = originalDisplay;
            }
        }
    },

    handlePopups() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 3;

            const checkAndClickPopups = () => {
                try {
                    let clicked = false;

                    const dialogs = document.querySelectorAll('.ui-dialog-title');
                    for (const dialog of dialogs) {
                        if (dialog.textContent.includes("Propriétés requises vides")) {
                            console.warn('⚠️ Propriétés manquantes détectées');
                            alert('Des propriétés obligatoires sont manquantes. Vérifiez titre/description.');
                            resolve();
                            return;
                        }
                    }

                    const okButton = document.querySelector('#infos_ok');
                    if (okButton && window.getComputedStyle(okButton).display !== 'none') {
                        this.simulateClick(okButton);
                        clicked = true;
                        console.log('✅ Bouton OK cliqué');
                    }

                    attempts++;
                    if (clicked && attempts < maxAttempts) {
                        setTimeout(checkAndClickPopups, this.CONFIG.validationDelay);
                    } else {
                        console.log('✅ Tous les popups traités');
                        resolve();
                    }
                } catch (error) {
                    console.error('Erreur handlePopups:', error);
                    resolve();
                }
            };

            setTimeout(checkAndClickPopups, this.CONFIG.validationDelay);
        });
    },

    async sendValidationRequest(params) {
        try {
            const response = await fetch('/basecat/pim/product.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams(params)
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Erreur sendValidationRequest:', error);
            throw error;
        }
    },

    getAllPhotoSections() {
        return document.querySelectorAll('div[id="photo"].js_refco');
    },

    async validateSinglePhoto(productCode, purchaseColor) {
        for (let i = 0; i < this.CONFIG.retryAttempts; i++) {
            try {
                const params = {
                    'action': 'bloc_photo_validation',
                    'code': productCode,
                    'validate_all': 'false',
                    'validation[block]': 'photo_block',
                    'validation[purchase_color]': purchaseColor
                };

                await this.sendValidationRequest(params);
                console.log(`✅ Photo validée pour couleur ${purchaseColor}`);
                return;
            } catch (error) {
                if (i === this.CONFIG.retryAttempts - 1) {
                    console.error(`❌ Échec validation couleur ${purchaseColor}`);
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.CONFIG.retryDelay));
            }
        }
    },

    async validateAllPhotos() {
        try {
            const { productCode } = this.getProductInfo();
            const photoSections = this.getAllPhotoSections();

            console.log(`📸 ${photoSections.length} sections photos trouvées`);

            let successCount = 0;
            let skipCount = 0;

            for (const section of photoSections) {
                const purchaseColor = section.getAttribute('data-purchase_color');
                const validateButton = section.querySelector('button.validated.one_locale_validation');
                const hasImageContainer = !!section.querySelector('.image-container');

                if (!hasImageContainer) {
                    console.warn(`⏭️ Section ${purchaseColor} ignorée (pas d'image)`);
                    skipCount++;
                    continue;
                }

                if (validateButton) {
                    console.log(`🔄 Validation photo: ${purchaseColor}`);

                    await this.validateSinglePhoto(productCode, purchaseColor);
                    this.simulateClick(validateButton);

                    await new Promise(resolve => setTimeout(resolve, this.CONFIG.validationDelay));
                    successCount++;
                } else {
                    skipCount++;
                }
            }

            await this.handlePopups();

            return {
                success: true,
                validated: successCount,
                skipped: skipCount
            };
        } catch (error) {
            console.error('❌ Erreur validateAllPhotos:', error);
            throw error;
        }
    },

    async validateDescriptionAndPhotos() {
        try {
            await this.validateAllPhotos();

            const validateButton = document.querySelector("#descriptif .validated");
            const saveButton = document.querySelector("#descriptif .saved");

            if (validateButton && window.getComputedStyle(validateButton).display !== "none") {
                this.simulateClick(validateButton);
                console.log("✅ Bouton 'Valider' cliqué dans descriptif");
            } else if (saveButton && window.getComputedStyle(saveButton).display !== "none") {
                this.simulateClick(saveButton);
                console.log("✅ Bouton 'Enregistrer' cliqué dans descriptif");
            } else {
                throw new Error("Aucun bouton cliquable dans descriptif");
            }

            await this.handlePopups();

            return { success: true };
        } catch (error) {
            console.error('❌ Erreur validateDescriptionAndPhotos:', error);
            throw error;
        }
    }
};