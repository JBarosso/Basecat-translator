(function () {
    'use strict';

    console.log('🔍 Search redirect script chargé');

    const urlParams = new URLSearchParams(window.location.search);
    const locData = urlParams.get('loc_data');
    const productId = urlParams.get('id');

    if (locData && productId) {
        console.log('📍 Page produit détectée, ID:', productId, 'Langue:', locData);

        const initRedirect = () => {
            const searchButton = document.querySelector(`a[href="/basecat/pim/?query=${productId}"]`);

            if (searchButton) {
                console.log('🔘 Bouton retour trouvé:', searchButton.href);

                searchButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Utiliser loc_data de l'URL actuelle et toujours mettre loc=fr_FR
                    const searchUrl = `/basecat/pim/?query=${productId}&loc_data=${locData}&loc=fr_FR`;

                    console.log('🎯 Redirection vers:', searchUrl);
                    window.location.href = searchUrl;
                }, true); 

                console.log(`✅ Redirection configurée pour la langue: ${locData}`);
            } else {
                console.warn('⚠️ Bouton retour non trouvé');
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initRedirect);
        } else {
            initRedirect();
        }

        const observer = new MutationObserver(() => {
            const searchButton = document.querySelector('a[title="Retour aux résultats de recherche"]');
            if (searchButton && !searchButton.dataset.redirectConfigured) {
                searchButton.dataset.redirectConfigured = 'true';
                initRedirect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();