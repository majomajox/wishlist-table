// Attendee Interface JavaScript
class AttendeeApp {
    constructor() {
        this.token = this.getTokenFromUrl();
        this.eventData = null;
        this.currentLanguage = localStorage.getItem('language') || 'de';
        this.init();
    }

    init() {
        if (!this.token) {
            this.showError('Invalid or missing attendee token');
            return;
        }

        // Set up event listeners first
        this.setupGiftActionListeners();
        this.setupLanguageSwitcher();
        
        this.loadEventData();
    }

    getTokenFromUrl() {
        const path = window.location.pathname;
        const match = path.match(/\/event\/(.+)/);
        return match ? match[1] : null;
    }

    async loadEventData() {
        try {
            console.log('Loading event data for token:', this.token);
            this.showLoading();
            const response = await fetch(`/api/attendee/event/${this.token}`);
            console.log('API response status:', response.status);

            if (response.ok) {
                this.eventData = await response.json();
                console.log('Event data loaded:', this.eventData);
                this.showAttendeeScreen();
                this.renderEventData();
            } else if (response.status === 410) {
                // Event is archived or no longer available
                const error = await response.json();
                console.log('Event no longer available:', error);
                this.showError(error.message || 'This event is no longer available.');
            } else {
                const error = await response.json();
                console.error('API error:', error);
                this.showError(error.error || 'Event not found');
            }
        } catch (error) {
            console.error('Error loading event:', error);
            this.showError('Failed to load event data');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
        document.getElementById('error-screen').style.display = 'none';
        document.getElementById('attendee-screen').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('error-screen').style.display = 'flex';
        
        // Update error message
        document.getElementById('error-message').textContent = message;
        
        // Update error title based on message content
        const errorTitle = document.getElementById('error-title');
        if (message && message.includes('no longer available')) {
            errorTitle.textContent = this.currentLanguage === 'de' ? 'Event nicht verfügbar' : 'Event Not Available';
        } else {
            errorTitle.textContent = this.currentLanguage === 'de' ? 'Event nicht gefunden' : 'Event Not Found';
        }
    }

    showAttendeeScreen() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('error-screen').style.display = 'none';
        document.getElementById('attendee-screen').style.display = 'block';
    }

    renderEventData() {
        console.log('Rendering event data:', this.eventData);
        const { event, attendee, gift_items, selected_items } = this.eventData;

        // Update gift sender information
        document.getElementById('gift-sender').textContent = attendee.name;

        // Update event info
        document.getElementById('event-title').textContent = event.subject;
        document.getElementById('event-description').textContent = event.description || '';
        document.getElementById('gift-receiver').textContent = event.gift_receiver_name;

        // Update meta items with proper language
        const giftRecipientLabel = this.currentLanguage === 'de' ? 'Geschenkempfänger' : 'Gift Recipient';
        const giftSenderLabel = this.currentLanguage === 'de' ? 'Geschenkgeber' : 'Gift Sender';
        
        const metaItems = document.querySelectorAll('.meta-item strong');
        metaItems.forEach(item => {
            if (item.textContent.includes('Gift Recipient') || item.textContent.includes('Geschenkempfänger')) {
                item.textContent = giftRecipientLabel + ':';
            } else if (item.textContent.includes('Gift Sender') || item.textContent.includes('Geschenkgeber')) {
                item.textContent = giftSenderLabel + ':';
            }
        });

        // Render gift items
        console.log('Rendering gift items:', gift_items);
        this.renderGiftItems(gift_items);

        // Update section headers with proper language
        const availableGiftsTitle = this.currentLanguage === 'de' ? 'Geschenkartikel' : ' Gift Items';
        const availableGiftsDesc = this.currentLanguage === 'de' ? 
            '' : 
            '';
        
        const sectionHeader = document.querySelector('.section-header h3');
        if (sectionHeader) {
            sectionHeader.textContent = availableGiftsTitle;
        }
        
        const sectionDesc = document.querySelector('.section-header p');
        if (sectionDesc) {
            sectionDesc.textContent = availableGiftsDesc;
        }

        // Update footer text
        const footerText = this.currentLanguage === 'de' ? 
            'Digitaler Geschenktisch - Wähle Geschenke aus, um zu diesem Event beizutragen' : 
            'Digital Gift Table - Select gifts to contribute to this event';
        
        const footer = document.querySelector('.footer p');
        if (footer) {
            footer.textContent = footerText;
        }

        // Render selected items
        this.renderSelectedItems(selected_items);

        // Show/hide empty state
        const emptyState = document.getElementById('empty-state');
        if (gift_items.length === 0) {
            emptyState.style.display = 'block';
            
            // Update empty state text
            const emptyStateTitle = this.currentLanguage === 'de' ? 'Noch keine Geschenkartikel' : 'No Gift Items Yet';
            const emptyStateDesc = this.currentLanguage === 'de' ? 
                'Der Event-Organisator hat noch keine Geschenkartikel hinzugefügt. Schau später nochmal vorbei!' : 
                'The event organizer hasn\'t added any gift items yet. Check back later!';
            
            const emptyStateH3 = emptyState.querySelector('h3');
            if (emptyStateH3) {
                emptyStateH3.textContent = emptyStateTitle;
            }
            
            const emptyStateP = emptyState.querySelector('p');
            if (emptyStateP) {
                emptyStateP.textContent = emptyStateDesc;
            }
        } else {
            emptyState.style.display = 'none';
        }

        // Apply translations after rendering with a small delay
        setTimeout(() => {
            this.updateUIText();
        }, 100);
    }

    renderGiftItems(giftItems) {
        const container = document.getElementById('gifts-list');
        
        // Get translations
        const selectedByYouText = this.currentLanguage === 'de' ? 'Von dir ausgewählt' : 'Selected by you';
        const selectedByText = this.currentLanguage === 'de' ? 'Ausgewählt von' : 'Selected by';
        const availableText = this.currentLanguage === 'de' ? 'Verfügbar' : 'Available';
        
        // Group gifts by selection status
        const availableGifts = giftItems.filter(g => !g.selected_by_attendee_id);
        const mySelectedGifts = giftItems.filter(g => g.selected_by_attendee_id === this.eventData.attendee.id);
        const othersSelectedGifts = giftItems.filter(g => g.selected_by_attendee_id && g.selected_by_attendee_id !== this.eventData.attendee.id);

        const renderGiftCard = (gift) => {
            const isSelected = gift.selected_by_attendee_id === this.eventData.attendee.id;
            const isSelectedByOther = gift.selected_by_attendee_id && !isSelected;
            const isEventClosed = this.eventData.event.status === 'archived';

            return `
                <div class="gift-card ${isSelected ? 'selected' : ''} ${isSelectedByOther ? 'selected-by-other' : ''}">
                    <div class="gift-status ${isSelected ? 'selected' : isSelectedByOther ? 'selected-by-other' : 'available'}">
                        ${isSelected ? selectedByYouText : isSelectedByOther ? `${selectedByText} ${gift.selected_by_name}` : availableText}
                    </div>
                    <h4>${gift.name}</h4>
                    ${gift.price ? `<div class="gift-price">€${gift.price}</div>` : ''}
                    ${gift.store_urls && Array.isArray(gift.store_urls) && gift.store_urls.length > 0 ? `
                        <div class="gift-stores">
                            <h5>${this.currentLanguage === 'de' ? 'Verfügbar bei:' : 'Available at:'}</h5>
                            <ul>
                                ${gift.store_urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <div class="gift-actions">
                        ${!isEventClosed ? (
                            isSelected ? 
                                `<button class="btn btn-sm btn-warning gift-action-btn" data-action="unselect" data-gift-id="${gift.id}">
                                    <i class="fas fa-times"></i> <span class="btn-text">${this.currentLanguage === 'de' ? 'Abwählen' : 'Unselect'}</span>
                                </button>` :
                                !isSelectedByOther ?
                                    `<button class="btn btn-sm btn-primary gift-action-btn" data-action="select" data-gift-id="${gift.id}">
                                        <i class="fas fa-check"></i> <span class="btn-text">${this.currentLanguage === 'de' ? 'Auswählen' : 'Select'}</span>
                                    </button>` :
                                    `<button class="btn btn-sm btn-secondary" disabled>
                                        <i class="fas fa-lock"></i> <span class="btn-text">${selectedByText} ${gift.selected_by_name}</span>
                                    </button>`
                        ) : (
                            `<button class="btn btn-sm btn-secondary" disabled>
                                <i class="fas fa-archive"></i> <span class="btn-text">${this.currentLanguage === 'de' ? 'Event archiviert' : 'Event Archived'}</span>
                            </button>`
                        )}
                    </div>
                </div>
            `;
        };

        const renderGiftGroup = (groupGifts, titleKey) => {
            if (groupGifts.length === 0) return '';
            
            return `
                <div class="gift-group">
                    <h3 class="gift-group-title">${titleKey}</h3>
                    <div class="gifts-grid">
                        ${groupGifts.map(gift => renderGiftCard(gift)).join('')}
                    </div>
                </div>
            `;
        };

        const availableLabel = this.currentLanguage === 'de' ? 'Verfügbare Geschenke' : 'Available Gifts';
        const mySelectionLabel = this.currentLanguage === 'de' ? 'Von mir ausgewählt' : 'My Selection';
        const selectedByOthersLabel = this.currentLanguage === 'de' ? 'Von anderen ausgewählt' : 'Selected by Others';

        container.innerHTML = 
            renderGiftGroup(availableGifts, availableLabel) +
            renderGiftGroup(mySelectedGifts, mySelectionLabel) +
            renderGiftGroup(othersSelectedGifts, selectedByOthersLabel);
    }

    renderSelectedItems(selectedItems) {
        const summary = document.getElementById('selected-summary');
        const container = document.getElementById('selected-items-list');

        if (selectedItems.length === 0) {
            summary.style.display = 'none';
            return;
        }

        summary.style.display = 'block';
        container.innerHTML = selectedItems.map(item => `
            <div class="selected-item">
                <div>
                    <h5>${item.name}</h5>
                    ${item.price ? `<p>€${item.price}</p>` : ''}
                </div>
                <button class="btn btn-sm btn-warning gift-action-btn" data-action="unselect" data-gift-id="${item.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    setupGiftActionListeners() {
        // Use event delegation to handle clicks on gift action buttons
        // Only add the listener once
        if (!this.listenersSetup) {
            document.addEventListener('click', (e) => {
                const button = e.target.closest('.gift-action-btn');
                if (button) {
                    const action = button.dataset.action;
                    const giftId = parseInt(button.dataset.giftId);
                    
                    if (action === 'select') {
                        this.selectGift(giftId);
                    } else if (action === 'unselect') {
                        this.unselectGift(giftId);
                    }
                }
            });
            this.listenersSetup = true;
        }
    }

    setupLanguageSwitcher() {
        const languageSelect = document.getElementById('attendee-language-select');
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
            languageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }

    setLanguage(language) {
        this.currentLanguage = language;
        localStorage.setItem('language', language);
        
        // Update the dropdown value
        const languageSelect = document.getElementById('attendee-language-select');
        if (languageSelect) {
            languageSelect.value = language;
        }
        
        // Update UI text immediately
        this.updateUIText();
        
        // Re-render dynamic content if event data is loaded
        if (this.eventData) {
            setTimeout(() => {
                this.renderEventData();
            }, 50);
        }
    }

    updateUIText() {
        console.log('Updating UI text to language:', this.currentLanguage);
        
        const translations = {
            de: {
                'Digital Gift Table': 'Digitaler Geschenktisch',
                'Gift Recipient': 'Geschenkempfänger',
                'Gift Sender': 'Geschenkgeber',
                'Your Selected Gifts': 'Deine ausgewählten Geschenke',
                'Available Gift Items': 'Verfügbare Geschenkartikel',
                'Select the gifts you\'d like to contribute to this event': 'Wähle die Geschenke aus, die du zu diesem Event beitragen möchtest',
                'No Gift Items Yet': 'Noch keine Geschenkartikel',
                'The event organizer hasn\'t added any gift items yet. Check back later!': 'Der Event-Organisator hat noch keine Geschenkartikel hinzugefügt. Schau später nochmal vorbei!',
                'Digital Gift Table - Select gifts to contribute to this event': 'Digitaler Geschenktisch - © 2025 Jörg Mauz',
                'Select': 'Auswählen',
                'Unselect': 'Abwählen',
                'Selected by you': 'Von dir ausgewählt',
                'Selected by': 'Ausgewählt von',
                'Available': 'Verfügbar',
                'Event Archived': 'Event archiviert',
                'Loading gift event...': 'Geschenk-Event wird geladen...',
                'Event Not Found': 'Event nicht gefunden',
                'Event Not Available': 'Event nicht verfügbar',
                'This event is no longer available.': 'Dieses Event ist nicht mehr verfügbar.',
                'This event has been archived and is no longer accessible.': 'Dieses Event wurde archiviert und ist nicht mehr zugänglich.',
                'The gift event you\'re looking for doesn\'t exist or has expired.': 'Das Geschenk-Event, nach dem du suchst, existiert nicht oder ist abgelaufen.',
                'Try Again': 'Erneut versuchen',
                'Confirm Selection': 'Auswahl bestätigen',
                'Cancel': 'Abbrechen',
                'Confirm': 'Bestätigen',
                'Processing...': 'Wird verarbeitet...',
                'Available at:': 'Verfügbar bei:',
                'Available Gifts': 'Verfügbare Geschenke',
                'My Selection': 'Von mir ausgewählt',
                'Selected by Others': 'Von anderen ausgewählt'
            },
            en: {
                'Digital Gift Table': 'Digital Gift Table',
                'Gift Recipient': 'Gift Recipient',
                'Gift Sender': 'Gift Sender',
                'Your Selected Gifts': 'Your Selected Gifts',
                'Available Gift Items': 'Available Gift Items',
                'Select the gifts you\'d like to contribute to this event': 'Select the gifts you\'d like to contribute to this event',
                'No Gift Items Yet': 'No Gift Items Yet',
                'The event organizer hasn\'t added any gift items yet. Check back later!': 'The event organizer hasn\'t added any gift items yet. Check back later!',
                'Digital Gift Table - Select gifts to contribute to this event': 'Digital Gift Table - © 2025 Jörg Mauz',
                'Select': 'Select',
                'Unselect': 'Unselect',
                'Selected by you': 'Selected by you',
                'Selected by': 'Selected by',
                'Available': 'Available',
                'Event Archived': 'Event Archived',
                'Loading gift event...': 'Loading gift event...',
                'Event Not Found': 'Event Not Found',
                'Event Not Available': 'Event Not Available',
                'This event is no longer available.': 'This event is no longer available.',
                'This event has been archived and is no longer accessible.': 'This event has been archived and is no longer accessible.',
                'The gift event you\'re looking for doesn\'t exist or has expired.': 'The gift event you\'re looking for doesn\'t exist or has expired.',
                'Try Again': 'Try Again',
                'Confirm Selection': 'Confirm Selection',
                'Cancel': 'Cancel',
                'Confirm': 'Confirm',
                'Processing...': 'Processing...',
                'Available at:': 'Available at:',
                'Available Gifts': 'Available Gifts',
                'My Selection': 'My Selection',
                'Selected by Others': 'Selected by Others'
            }
        };

        const currentTranslations = translations[this.currentLanguage] || translations.en;
        
        // Update all text elements with comprehensive selectors
        const selectors = [
            'h1', 'h1 span', 'h2', 'h3', 'h4', 'h5', 'p', 'span', 'button', 'label',
            '.event-meta span', '.section-header h3', 
            '.section-header p', '.gift-status', '.btn-text', '.meta-item',
            '#event-title', '#event-description', '#gift-receiver', '#gift-sender',
            '.footer p'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                const text = element.textContent.trim();
                if (currentTranslations[text]) {
                    element.textContent = currentTranslations[text];
                }
            });
        });

        // Update specific elements that might have mixed content
        const specificElements = [
            { selector: '.meta-item strong', text: 'Gift Recipient:', translationKey: 'Gift Recipient' },
            { selector: '.meta-item strong', text: 'Gift Sender:', translationKey: 'Gift Sender' },
            { selector: '.section-header h3', text: 'Available Gift Items', translationKey: 'Available Gift Items' },
            { selector: '.section-header p', text: 'Select the gifts you\'d like to contribute to this event', translationKey: 'Select the gifts you\'d like to contribute to this event' },
            { selector: '.footer p', text: 'Digital Gift Table - Select gifts to contribute to this event', translationKey: 'Digital Gift Table - Select gifts to contribute to this event' }
        ];

        specificElements.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element && element.textContent.trim() === item.text) {
                element.textContent = currentTranslations[item.translationKey];
            }
        });

        // Update placeholders
        document.querySelectorAll('input, textarea').forEach(element => {
            const placeholder = element.placeholder;
            if (placeholder && currentTranslations[placeholder]) {
                element.placeholder = currentTranslations[placeholder];
            }
        });
        
        console.log('UI text updated');
    }

    async selectGift(giftId) {
        if (this.eventData.event.status === 'archived') {
            console.log('Event is archived - cannot select gifts');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/attendee/select/${this.token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gift_item_id: giftId })
            });

            const data = await response.json();

            if (response.ok) {
                // Update local data
                this.eventData.gift_items = data.gift_items;
                this.eventData.selected_items = data.selected_items;
                
                // Re-render the interface
                this.renderGiftItems(data.gift_items);
                this.renderSelectedItems(data.selected_items);
            } else {
                console.error('Failed to select gift:', data.error);
            }
        } catch (error) {
            console.error('Error selecting gift:', error);
        } finally {
            this.hideLoading();
        }
    }

    async unselectGift(giftId) {
        if (this.eventData.event.status === 'archived') {
            console.log('Event is archived - cannot unselect gifts');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/attendee/unselect/${this.token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gift_item_id: giftId })
            });

            const data = await response.json();

            if (response.ok) {
                // Update local data
                this.eventData.gift_items = data.gift_items;
                this.eventData.selected_items = data.selected_items;
                
                // Re-render the interface
                this.renderGiftItems(data.gift_items);
                this.renderSelectedItems(data.selected_items);
            } else {
                console.error('Failed to unselect gift:', data.error);
            }
        } catch (error) {
            console.error('Error unselecting gift:', error);
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }
}

// Initialize the app when the page loads
const attendeeApp = new AttendeeApp();
