// Admin Interface JavaScript
class AdminApp {
    constructor() {
        this.currentEvent = null;
        this.token = localStorage.getItem('admin_token');
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupLanguageSwitchers();
        this.updateLanguageSwitcher();
        
        if (this.token) {
            this.verifyToken();
        } else {
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        // New event button
        document.getElementById('new-event-btn').addEventListener('click', () => {
            this.showEventModal();
        });

        // Back to events
        document.getElementById('back-to-events').addEventListener('click', () => {
            this.showEventsList();
        });

        // Event form
        document.getElementById('event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventSubmit();
        });

        // Gift form
        document.getElementById('gift-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGiftSubmit();
        });

        // Settings form
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordChange();
        });

        // Tab switching - use event delegation
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                this.switchTab(tabBtn.dataset.tab);
            }
        });

        // Modal controls
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Event actions
        document.getElementById('publish-event-btn').addEventListener('click', () => {
            this.publishEvent();
        });

        document.getElementById('set-draft-btn').addEventListener('click', () => {
            this.setDraft();
        });

        document.getElementById('archive-event-btn').addEventListener('click', () => {
            this.archiveEvent();
        });

        document.getElementById('clone-event-btn').addEventListener('click', () => {
            this.cloneEvent();
        });

        document.getElementById('edit-event-btn').addEventListener('click', () => {
            this.editEvent();
        });

        document.getElementById('delete-event-btn').addEventListener('click', () => {
            this.deleteEvent();
        });

        // Add attendees/gifts
        document.getElementById('add-attendees-btn').addEventListener('click', () => {
            if (this.currentEvent && this.currentEvent.status === 'archived') {
                this.showError('Cannot modify archived events');
                return;
            }
            this.showAddAttendeesModal();
        });

        document.getElementById('add-gift-btn').addEventListener('click', () => {
            if (this.currentEvent && this.currentEvent.status === 'archived') {
                this.showError('Cannot modify archived events');
                return;
            }
            this.showGiftModal();
        });
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.showAdminScreen();
                this.loadEvents();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.showLoginScreen();
        }
    }

    async handleLogin() {
        const formData = new FormData(document.getElementById('login-form'));
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            this.showLoading();
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('admin_token', this.token);
                this.showAdminScreen();
                this.loadEvents();
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('admin_token');
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('admin-screen').style.display = 'none';
    }

    showAdminScreen() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-screen').style.display = 'block';
    }

    setupLanguageSwitchers() {
        // Main interface language switcher
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }

        // Login interface language switcher
        const loginLanguageSelect = document.getElementById('login-language-select');
        if (loginLanguageSelect) {
            loginLanguageSelect.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/admin/events', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const events = await response.json();
            this.renderEvents(events);
        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load events');
        }
    }

    renderEvents(events) {
        const container = document.getElementById('events-list');
        
        if (events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gift"></i>
                    <h3>No Events Yet</h3>
                    <p>Create your first gift event to get started!</p>
                </div>
            `;
            return;
        }

        // Group events by status
        const publishedEvents = events.filter(e => e.status === 'published');
        const draftEvents = events.filter(e => e.status === 'draft');
        const archivedEvents = events.filter(e => e.status === 'archived');

        const renderEventGroup = (groupEvents, statusLabel) => {
            if (groupEvents.length === 0) return '';
            
            return `
                <div class="event-group">
                    <h3 class="event-group-title">${statusLabel}</h3>
                    <div class="events-grid">
                        ${groupEvents.map(event => `
                            <div class="event-card" data-event-id="${event.id}">
                                <h3>${event.subject} (${event.id})</h3>
                                <p>${event.description || 'No description'}</p>
                                <div class="event-meta">
                                    <span class="meta-item">
                                        <i class="fas fa-user"></i>
                                        ${event.gift_receiver_name}
                                    </span>
                                    <span class="meta-item">
                                        <i class="fas fa-users"></i>
                                        ${event.attendee_count} attendees
                                    </span>
                                    <span class="meta-item">
                                        <i class="fas fa-gift"></i>
                                        ${event.gift_count} gifts
                                    </span>
                                    <span class="meta-item">
                                        <i class="fas fa-circle status-indicator status-${event.status}"></i>
                                        ${event.status}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        const publishedLabel = this.currentLanguage === 'de' ? 'Veröffentlicht' : 'Published';
        const draftLabel = this.currentLanguage === 'de' ? 'Entwurf' : 'Draft';
        const archivedLabel = this.currentLanguage === 'de' ? 'Archiviert' : 'Archived';

        container.innerHTML = 
            renderEventGroup(publishedEvents, publishedLabel) +
            renderEventGroup(draftEvents, draftLabel) +
            renderEventGroup(archivedEvents, archivedLabel);
        
        // Add click event listeners to event cards
        container.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', () => {
                const eventId = parseInt(card.dataset.eventId);
                console.log('Event card clicked, event ID:', eventId);
                this.viewEvent(eventId);
            });
        });
    }


    async viewEvent(eventId) {
        try {
            this.showLoading();
            console.log('Loading event:', eventId);
            const response = await fetch(`/api/admin/events/${eventId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch event');
            }

            const event = await response.json();
            console.log('Event loaded:', event);
            this.currentEvent = event;
            this.showEventDetails(event);
        } catch (error) {
            console.error('Error loading event:', error);
            this.showError('Failed to load event details: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    showEventDetails(event) {
        console.log('Showing event details:', event);
        document.getElementById('events-section').style.display = 'none';
        document.getElementById('event-details-section').style.display = 'block';

        // Update event info
        document.getElementById('event-title').textContent = `${event.subject} (${event.id})`;
        document.getElementById('event-description').textContent = event.description || 'No description';
        document.getElementById('gift-receiver').textContent = event.gift_receiver_name;
        document.getElementById('attendee-count').textContent = event.attendees ? event.attendees.length : 0;
        document.getElementById('gift-count').textContent = event.gift_items ? event.gift_items.length : 0;
        document.getElementById('event-status').textContent = event.status;

        // Update status indicator
        const indicator = document.getElementById('status-indicator');
        indicator.className = `fas fa-circle status-indicator status-${event.status}`;

        // Show/hide action buttons based on status
        const publishBtn = document.getElementById('publish-event-btn');
        const setDraftBtn = document.getElementById('set-draft-btn');
        const archiveBtn = document.getElementById('archive-event-btn');
        const cloneBtn = document.getElementById('clone-event-btn');

        // Hide all status buttons first
        publishBtn.style.display = 'none';
        setDraftBtn.style.display = 'none';
        archiveBtn.style.display = 'none';
        cloneBtn.style.display = 'none';

        // Show appropriate buttons based on status
        if (event.status === 'draft') {
            publishBtn.style.display = 'inline-flex';
        } else if (event.status === 'published') {
            setDraftBtn.style.display = 'inline-flex';
            archiveBtn.style.display = 'inline-flex';
            cloneBtn.style.display = 'inline-flex';
        } else if (event.status === 'archived') {
            cloneBtn.style.display = 'inline-flex';
        }

        // Hide Edit button if archived
        const editBtn = document.getElementById('edit-event-btn');
        if (event.status === 'archived') {
            editBtn.style.display = 'none';
        } else {
            editBtn.style.display = 'inline-flex';
        }

        // Disable Add Attendees and Add Gift buttons if archived
        const addAttendeesBtn = document.getElementById('add-attendees-btn');
        const addGiftBtn = document.getElementById('add-gift-btn');
        
        if (event.status === 'archived') {
            addAttendeesBtn.disabled = true;
            addAttendeesBtn.style.opacity = '0.5';
            addAttendeesBtn.style.cursor = 'not-allowed';
            
            addGiftBtn.disabled = true;
            addGiftBtn.style.opacity = '0.5';
            addGiftBtn.style.cursor = 'not-allowed';
        } else {
            addAttendeesBtn.disabled = false;
            addAttendeesBtn.style.opacity = '1';
            addAttendeesBtn.style.cursor = 'pointer';
            
            addGiftBtn.disabled = false;
            addGiftBtn.style.opacity = '1';
            addGiftBtn.style.cursor = 'pointer';
        }

        // Render attendees and gifts
        this.renderAttendees(event.attendees);
        this.renderGifts(event.gift_items);
    }

    renderAttendees(attendees) {
        const container = document.getElementById('attendees-list');
        const isArchived = this.currentEvent && this.currentEvent.status === 'archived';
        
        if (attendees.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Attendees</h3>
                    <p>Add attendees to this event</p>
                </div>
            `;
            return;
        }

        container.innerHTML = attendees.map(attendee => `
            <div class="attendee-item">
                <div class="attendee-info">
                    <strong>${attendee.name}</strong>
                    <span>${attendee.email}</span>
                </div>
                <div class="attendee-actions">
                    <button class="copy-link-btn" data-attendee-token="${attendee.unique_token}" ${isArchived ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <i class="fas fa-copy"></i> Copy Link
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminApp.deleteAttendee(${attendee.id})" ${isArchived ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners for copy link buttons
        container.querySelectorAll('.copy-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.target.closest('.copy-link-btn');
                if (button.disabled) {
                    return; // Don't copy if button is disabled
                }
                const token = button.dataset.attendeeToken;
                this.copyAttendeeLink(token);
            });
        });
    }

    renderGifts(gifts) {
        const container = document.getElementById('gifts-list');
        const isArchived = this.currentEvent && this.currentEvent.status === 'archived';
        
        if (gifts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-gift"></i>
                    <h3>No Gift Items</h3>
                    <p>Add gift items to this event</p>
                </div>
            `;
            return;
        }

        // Group gifts by selection status
        const availableGifts = gifts.filter(g => !g.selected_by_attendee_id);
        const selectedGifts = gifts.filter(g => g.selected_by_attendee_id);

        const renderGiftCard = (gift) => {
            return `
                <div class="gift-card ${gift.selected_by_attendee_id ? 'selected-by-other' : ''}">
                    <div class="gift-status ${gift.selected_by_attendee_id ? 'selected-by-other' : 'available'}">
                        ${gift.selected_by_attendee_id ? `Selected by ${gift.selected_by_name}` : 'Available'}
                    </div>
                    <h4>${gift.name}</h4>
                    ${gift.price ? `<div class="gift-price">€${gift.price}</div>` : ''}
                    ${gift.store_urls && Array.isArray(gift.store_urls) && gift.store_urls.length > 0 ? `
                        <div class="gift-stores">
                            <h5>Available at:</h5>
                            <ul>
                                ${gift.store_urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <div class="gift-actions">
                        <button class="btn btn-sm btn-primary" onclick="adminApp.editGift(${gift.id})" ${isArchived ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminApp.deleteGift(${gift.id})" ${isArchived ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i> Delete
                        </button>
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
        const selectedLabel = this.currentLanguage === 'de' ? 'Bereits ausgewählt' : 'Already Selected';

        container.innerHTML = 
            renderGiftGroup(availableGifts, availableLabel) +
            renderGiftGroup(selectedGifts, selectedLabel);
    }

    showEventsList() {
        document.getElementById('events-section').style.display = 'block';
        document.getElementById('event-details-section').style.display = 'none';
        this.currentEvent = null;
        
        // Reload events to refresh the list with updated statuses
        this.loadEvents();
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log('Found tab buttons:', tabButtons.length);
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        console.log('Active tab button:', activeTabBtn);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
        }

        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        console.log('Found tab contents:', tabContents.length);
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        const activeTabContent = document.getElementById(`${tabName}-tab`);
        console.log('Active tab content:', activeTabContent);
        if (activeTabContent) {
            activeTabContent.classList.add('active');
        }
    }

    showEventModal(event = null) {
        const modal = document.getElementById('event-modal');
        const title = document.getElementById('event-modal-title');
        const form = document.getElementById('event-form');

        if (event) {
            title.textContent = 'Edit Event';
            form.dataset.eventId = event.id;
            document.getElementById('event-subject').value = event.subject;
            document.getElementById('event-description').value = event.description || '';
            document.getElementById('gift-receiver-name').value = event.gift_receiver_name;
            
            // Populate attendees textarea with existing attendees
            if (event.attendees && event.attendees.length > 0) {
                const attendeesText = event.attendees.map(a => `${a.name}, ${a.email}`).join('\n');
                document.getElementById('attendees-input').value = attendeesText;
            } else {
                document.getElementById('attendees-input').value = '';
            }
        } else {
            title.textContent = 'Create New Event';
            form.reset();
            delete form.dataset.eventId;
        }

        modal.classList.add('show');
    }

    showGiftModal(gift = null) {
        const modal = document.getElementById('gift-modal');
        const title = document.getElementById('gift-modal-title');
        const form = document.getElementById('gift-form');

        if (gift) {
            title.textContent = 'Edit Gift Item';
            form.dataset.giftId = gift.id;
            document.getElementById('gift-name').value = gift.name;
            document.getElementById('gift-price').value = gift.price || '';
            document.getElementById('gift-store-urls').value = gift.store_urls ? gift.store_urls.join('\n') : '';
        } else {
            title.textContent = 'Add Gift Item';
            form.reset();
            delete form.dataset.giftId;
        }

        modal.classList.add('show');
    }

    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const form = document.getElementById('settings-form');
        const errorDiv = document.getElementById('password-error');
        
        form.reset();
        errorDiv.style.display = 'none';
        modal.classList.add('show');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    async handleEventSubmit() {
        const form = document.getElementById('event-form');
        const formData = new FormData(form);
        
        const eventData = {
            subject: formData.get('subject'),
            description: formData.get('description'),
            gift_receiver_name: formData.get('gift_receiver_name'),
            attendees: this.parseAttendees(formData.get('attendees'))
        };
        
        console.log('Submitting event data:', eventData);

        try {
            this.showLoading();
            const eventId = form.dataset.eventId;
            const url = eventId ? `/api/admin/events/${eventId}` : '/api/admin/events';
            const method = eventId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                this.closeModal();
                this.loadEvents();
                if (eventId) {
                    this.viewEvent(eventId);
                }
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to save event');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            this.showError('Failed to save event');
        } finally {
            this.hideLoading();
        }
    }

    async handleGiftSubmit() {
        const form = document.getElementById('gift-form');
        const formData = new FormData(form);
        
        const giftData = {
            name: formData.get('name'),
            price: parseFloat(formData.get('price')) || null,
            store_urls: this.parseStoreUrls(formData.get('store_urls'))
        };
        
        console.log('Submitting gift data:', giftData);
        console.log('Current event ID:', this.currentEvent ? this.currentEvent.id : 'No current event');

        if (!this.currentEvent) {
            this.showError('No event selected. Please select an event first.');
            return;
        }

        try {
            this.showLoading();
            const giftId = form.dataset.giftId;
            const url = giftId ? `/api/admin/gift-items/${giftId}` : `/api/admin/events/${this.currentEvent.id}/gift-items`;
            const method = giftId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(giftData)
            });

            if (response.ok) {
                this.closeModal();
                this.viewEvent(this.currentEvent.id);
            } else {
                const error = await response.json();
                console.error('Gift item save error:', error);
                this.showError(error.error || 'Failed to save gift item');
            }
        } catch (error) {
            console.error('Error saving gift item:', error);
            this.showError('Failed to save gift item');
        } finally {
            this.hideLoading();
        }
    }

    parseAttendees(attendeesText) {
        if (!attendeesText.trim()) return [];
        
        return attendeesText.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const [name, email] = line.split(',').map(s => s.trim());
                return { name, email };
            });
    }

    parseStoreUrls(urlsText) {
        if (!urlsText.trim()) return [];
        
        return urlsText.split('\n')
            .map(url => url.trim())
            .filter(url => url);
    }

    async publishEvent() {
        if (!confirm('Are you sure you want to publish this event? This will send emails to all attendees.')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/events/${this.currentEvent.id}/publish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.viewEvent(this.currentEvent.id);
                this.showSuccess('Event published successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to publish event');
            }
        } catch (error) {
            console.error('Error publishing event:', error);
            this.showError('Failed to publish event');
        } finally {
            this.hideLoading();
        }
    }

    async setDraft() {
        if (!confirm('Are you sure you want to set this event back to draft? Attendees will no longer be able to access it.')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/events/${this.currentEvent.id}/draft`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.viewEvent(this.currentEvent.id);
                this.showSuccess('Event set to draft successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to set event to draft');
            }
        } catch (error) {
            console.error('Error setting event to draft:', error);
            this.showError('Failed to set event to draft');
        } finally {
            this.hideLoading();
        }
    }

    async archiveEvent() {
        if (!confirm('Are you sure you want to archive this event? This will make it read-only.')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/events/${this.currentEvent.id}/archive`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.viewEvent(this.currentEvent.id);
                this.showSuccess('Event archived successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to archive event');
            }
        } catch (error) {
            console.error('Error archiving event:', error);
            this.showError('Failed to archive event');
        } finally {
            this.hideLoading();
        }
    }

    async cloneEvent() {
        if (!confirm('Clone this event? This will create a copy with all attendees but without gift items.')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/events/${this.currentEvent.id}/clone`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const clonedEvent = await response.json();
                this.showSuccess('Event cloned successfully!');
                
                // Show the event modal for the cloned event so user can edit it
                this.showEventModal(clonedEvent);
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to clone event');
            }
        } catch (error) {
            console.error('Error cloning event:', error);
            this.showError('Failed to clone event');
        } finally {
            this.hideLoading();
        }
    }

    editEvent() {
        this.showEventModal(this.currentEvent);
    }

    async deleteEvent() {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/events/${this.currentEvent.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.showEventsList();
                this.loadEvents();
                this.showSuccess('Event deleted successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to delete event');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showError('Failed to delete event');
        } finally {
            this.hideLoading();
        }
    }

    async deleteAttendee(attendeeId) {
        if (this.currentEvent && this.currentEvent.status === 'archived') {
            this.showError('Cannot modify archived events');
            return;
        }

        if (!confirm('Are you sure you want to remove this attendee?')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/attendees/${attendeeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.viewEvent(this.currentEvent.id);
                this.showSuccess('Attendee removed successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to remove attendee');
            }
        } catch (error) {
            console.error('Error removing attendee:', error);
            this.showError('Failed to remove attendee');
        } finally {
            this.hideLoading();
        }
    }

    editGift(giftId) {
        if (this.currentEvent && this.currentEvent.status === 'archived') {
            this.showError('Cannot modify archived events');
            return;
        }

        const gift = this.currentEvent.gift_items.find(g => g.id === giftId);
        this.showGiftModal(gift);
    }

    async deleteGift(giftId) {
        if (this.currentEvent && this.currentEvent.status === 'archived') {
            this.showError('Cannot modify archived events');
            return;
        }

        if (!confirm('Are you sure you want to delete this gift item?')) {
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/gift-items/${giftId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.viewEvent(this.currentEvent.id);
                this.showSuccess('Gift item deleted successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to delete gift item');
            }
        } catch (error) {
            console.error('Error deleting gift item:', error);
            this.showError('Failed to delete gift item');
        } finally {
            this.hideLoading();
        }
    }

    showAddAttendeesModal() {
        if (this.currentEvent && this.currentEvent.status === 'archived') {
            this.showError('Cannot modify archived events');
            return;
        }

        // Create a simple modal for adding attendees
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Attendees</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="add-attendees-form">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="new-attendees-input">Attendees (one per line)</label>
                            <textarea id="new-attendees-input" name="attendees" rows="5" placeholder="Name, Email&#10;John Doe, john@example.com&#10;Jane Smith, jane@example.com"></textarea>
                            <small>Format: Name, Email (one per line)</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Attendees</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#add-attendees-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddAttendees(modal);
        });
    }

    async handleAddAttendees(modal) {
        const form = modal.querySelector('#add-attendees-form');
        const formData = new FormData(form);
        const attendees = this.parseAttendees(formData.get('attendees'));
        
        if (attendees.length === 0) {
            this.showError('Please enter at least one attendee');
            return;
        }

        try {
            this.showLoading();
            const response = await fetch(`/api/admin/events/${this.currentEvent.id}/attendees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ attendees })
            });

            if (response.ok) {
                document.body.removeChild(modal);
                this.viewEvent(this.currentEvent.id);
                this.showSuccess('Attendees added successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to add attendees');
            }
        } catch (error) {
            console.error('Error adding attendees:', error);
            this.showError('Failed to add attendees');
        } finally {
            this.hideLoading();
        }
    }

    async handlePasswordChange() {
        const form = document.getElementById('settings-form');
        const formData = new FormData(form);
        const errorDiv = document.getElementById('password-error');
        
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'New passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }

        // Validate password length
        if (newPassword.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            errorDiv.style.display = 'block';
            return;
        }

        errorDiv.style.display = 'none';

        try {
            this.showLoading();
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ 
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (response.ok) {
                this.closeModal();
                this.showSuccess('Password changed successfully!');
            } else {
                const error = await response.json();
                errorDiv.textContent = error.error || 'Failed to change password';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Error changing password:', error);
            errorDiv.textContent = 'Failed to change password';
            errorDiv.style.display = 'block';
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

    showError(message) {
        // Log error to console instead of showing alert
        console.error('Error:', message);
    }

    showSuccess(message) {
        // Log success to console instead of showing alert
        console.log('Success:', message);
    }

    async copyAttendeeLink(token) {
        const url = `${window.location.origin}/event/${token}`;
        const successMessage = this.currentLanguage === 'de' ? 
            'Teilnehmer-Link in die Zwischenablage kopiert!' : 
            'Attendee link copied to clipboard!';
        
        try {
            await navigator.clipboard.writeText(url);
            this.showSuccess(successMessage);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess(successMessage);
        }
    }

    setLanguage(language) {
        this.currentLanguage = language;
        localStorage.setItem('language', language);
        this.updateLanguageSwitcher();
        this.updateUIText();
    }

    updateLanguageSwitcher() {
        // Update main interface language switcher
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.value = this.currentLanguage;
        }

        // Update login interface language switcher
        const loginLanguageSelect = document.getElementById('login-language-select');
        if (loginLanguageSelect) {
            loginLanguageSelect.value = this.currentLanguage;
        }
    }

    updateUIText() {
        // This is a simple implementation - in a real app you'd use a proper i18n library
        const translations = {
            de: {
                'Digital Gift Table': 'Digitaler Geschenktisch',
                'Admin Login': 'Admin-Anmeldung',
                'Username or Email': 'Benutzername oder E-Mail',
                'Password': 'Passwort',
                'Login': 'Anmelden',
                'Digital Gift Table Admin': 'Digitaler Geschenktisch Admin',
                'New Event': 'Neues Event',
                'Logout': 'Abmelden',
                'Gift Events': 'Geschenk-Events',
                'No Events Yet': 'Noch keine Events',
                'Create your first gift event to get started!': 'Erstellen Sie Ihr erstes Geschenk-Event!',
                'attendees': 'Teilnehmer',
                'gifts': 'Geschenke',
                'Back to Events': 'Zurück zu Events',
                'Publish Event': 'Event veröffentlichen',
                'Set to Draft': 'Auf Entwurf setzen',
                'Archive Event': 'Event archivieren',
                'Clone Event': 'Event klonen',
                'Edit Event': 'Event bearbeiten',
                'Delete Event': 'Event löschen',
                'Settings': 'Einstellungen',
                'Change Password': 'Passwort ändern',
                'Current Password *': 'Aktuelles Passwort *',
                'New Password *': 'Neues Passwort *',
                'Confirm New Password *': 'Neues Passwort bestätigen *',
                'Minimum 6 characters': 'Mindestens 6 Zeichen',
                'Gift Recipient': 'Geschenkempfänger',
                'Attendees': 'Teilnehmer',
                'Gift Items': 'Geschenk-Artikel',
                'Status': 'Status',
                'Event Attendees': 'Event-Teilnehmer',
                'Add Attendees': 'Teilnehmer hinzufügen',
                'Add Gift Item': 'Geschenk-Artikel hinzufügen',
                'Create New Event': 'Neues Event erstellen',
                'Event Subject *': 'Event-Titel *',
                'Description': 'Beschreibung',
                'Gift Receiver Name *': 'Geschenkempfänger Name *',
                'Attendees (one per line)': 'Teilnehmer (eine pro Zeile)',
                'Format: Name, Email (one per line)': 'Format: Name, E-Mail (eine pro Zeile)',
                'Cancel': 'Abbrechen',
                'Save Event': 'Event speichern',
                'Add Gift Item': 'Geschenk-Artikel hinzufügen',
                'Gift Name *': 'Geschenk-Name *',
                'Price': 'Preis',
                'Store URLs (one per line)': 'Shop-URLs (eine pro Zeile)',
                'Save Gift Item': 'Geschenk-Artikel speichern',
                'Loading...': 'Lädt...',
                'Copy Link': 'Link kopieren',
                'Attendee link copied to clipboard!': 'Teilnehmer-Link in die Zwischenablage kopiert!',
                'Cannot modify archived events': 'Archivierte Events können nicht geändert werden',
                'Published': 'Veröffentlicht',
                'Draft': 'Entwurf',
                'Archived': 'Archiviert',
                'Available Gifts': 'Verfügbare Geschenke',
                'Already Selected': 'Bereits ausgewählt'
            },
            en: {
                'Digital Gift Table Admin': 'Digital Gift Table Admin',
                'New Event': 'New Event',
                'Logout': 'Logout',
                'Gift Events': 'Gift Events',
                'No Events Yet': 'No Events Yet',
                'Create your first gift event to get started!': 'Create your first gift event to get started!',
                'attendees': 'attendees',
                'gifts': 'gifts',
                'Back to Events': 'Back to Events',
                'Publish Event': 'Publish Event',
                'Set to Draft': 'Set to Draft',
                'Archive Event': 'Archive Event',
                'Clone Event': 'Clone Event',
                'Edit Event': 'Edit Event',
                'Delete Event': 'Delete Event',
                'Settings': 'Settings',
                'Change Password': 'Change Password',
                'Current Password *': 'Current Password *',
                'New Password *': 'New Password *',
                'Confirm New Password *': 'Confirm New Password *',
                'Minimum 6 characters': 'Minimum 6 characters',
                'Gift Recipient': 'Gift Recipient',
                'Attendees': 'Attendees',
                'Gift Items': 'Gift Items',
                'Status': 'Status',
                'Event Attendees': 'Event Attendees',
                'Add Attendees': 'Add Attendees',
                'Add Gift Item': 'Add Gift Item',
                'Create New Event': 'Create New Event',
                'Event Subject *': 'Event Subject *',
                'Description': 'Description',
                'Gift Receiver Name *': 'Gift Receiver Name *',
                'Attendees (one per line)': 'Attendees (one per line)',
                'Format: Name, Email (one per line)': 'Format: Name, Email (one per line)',
                'Cancel': 'Cancel',
                'Save Event': 'Save Event',
                'Add Gift Item': 'Add Gift Item',
                'Gift Name *': 'Gift Name *',
                'Price': 'Price',
                'Store URLs (one per line)': 'Store URLs (one per line)',
                'Save Gift Item': 'Save Gift Item',
                'Loading...': 'Loading...',
                'Copy Link': 'Copy Link',
                'Attendee link copied to clipboard!': 'Attendee link copied to clipboard!',
                'Cannot modify archived events': 'Cannot modify archived events',
                'Published': 'Published',
                'Draft': 'Draft',
                'Archived': 'Archived',
                'Available Gifts': 'Available Gifts',
                'Already Selected': 'Already Selected'
            }
        };

        const currentTranslations = translations[this.currentLanguage] || translations.en;
        
        // Update all text content
        document.querySelectorAll('h1, h2, h3, button, label, span, p, small').forEach(element => {
            const text = element.textContent.trim();
            if (currentTranslations[text]) {
                element.textContent = currentTranslations[text];
            }
        });

        // Update placeholders
        document.querySelectorAll('input, textarea').forEach(element => {
            const placeholder = element.placeholder;
            if (placeholder && currentTranslations[placeholder]) {
                element.placeholder = currentTranslations[placeholder];
            }
        });
    }
}

// Initialize the app when the page loads
const adminApp = new AdminApp();
