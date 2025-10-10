# Digital Gift Table - Responsive Webapp

A comprehensive web application for managing digital gift events and wishlists. This app allows administrative users to create and manage gift events, while attendees can select gifts they want to contribute.

## Features

### Administrative Features
- **Event Management**: Create, edit, publish, and close gift events
- **Attendee Management**: Add, edit, and remove event attendees
- **Gift Item Management**: Add, edit, and delete gift items with store URLs
- **Email Notifications**: Automatic email notifications to attendees
- **Real-time Updates**: Live updates when new gift items are added

### Attendee Features
- **Gift Selection**: Select gifts you want to contribute
- **Real-time Status**: See which gifts are selected by others
- **Personalized Links**: Unique links for each attendee
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: SQLite with proper relationships and constraints
- **Email**: Nodemailer for email notifications
- **Authentication**: JWT-based authentication
- **Security**: Helmet, CORS, rate limiting

## Installation

1. **Clone and setup**:
   ```bash
   cd wishlist01
   npm install
   ```

2. **Initialize database**:
   ```bash
   npm run init-db
   ```

3. **Configure environment** (optional):
   ```bash
   cp env.example .env
   # Edit .env with your email settings
   ```

4. **Start the server**:
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

5. **Access the application**:
   - Admin interface: http://localhost:3000/admin
   - Default login: admin / admin123

## Database Schema

The application uses SQLite with the following tables:

- **events**: Gift events with status tracking
- **attendees**: Event attendees with unique tokens
- **gift_items**: Gift items with store URLs and selection status
- **admin_users**: Administrative users
- **email_notifications**: Email notification log

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register new admin
- `GET /api/auth/verify` - Verify JWT token

### Admin API
- `GET /api/admin/events` - List all events
- `POST /api/admin/events` - Create new event
- `GET /api/admin/events/:id` - Get event details
- `PUT /api/admin/events/:id` - Update event
- `POST /api/admin/events/:id/publish` - Publish event
- `POST /api/admin/events/:id/close` - Close event
- `DELETE /api/admin/events/:id` - Delete event

### Attendee API
- `GET /api/attendee/event/:token` - Get event for attendee
- `POST /api/attendee/select/:token` - Select gift item
- `POST /api/attendee/unselect/:token` - Unselect gift item

## Usage

### Creating a Gift Event

1. Login to the admin interface
2. Click "New Event"
3. Fill in event details:
   - Event subject
   - Description
   - Gift receiver name
   - Attendees (name, email format)
4. Save the event

### Managing Gift Items

1. Open an event
2. Go to the "Gift Items" tab
3. Click "Add Gift Item"
4. Fill in gift details:
   - Name
   - Price (optional)
   - Store URLs (one per line)
5. Save the gift item

### Publishing an Event

1. Open a draft event
2. Click "Publish Event"
3. All attendees will receive personalized email invitations

### Attendee Experience

1. Click the personalized link in your email
2. View available gift items
3. Select gifts you want to contribute
4. See real-time updates when others select gifts

## Email Configuration

To enable email notifications, configure the following environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Digital Gift Table
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- SQL injection prevention
- XSS protection with Helmet

## Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Print media

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the server with nodemon for automatic restarts.

### Building for Production

```bash
npm run build
```

### Database Management

```bash
# Initialize database
npm run init-db

# The database file will be created at ./database/gift_table.db
```

## Project Structure

```
wishlist01/
├── src/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   └── utils/           # Utility functions
├── public/              # Frontend files
│   ├── admin.html       # Admin interface
│   ├── attendee.html    # Attendee interface
│   ├── admin.js         # Admin JavaScript
│   ├── attendee.js      # Attendee JavaScript
│   └── styles.css       # Responsive CSS
├── database/            # SQLite database
├── scripts/             # Database scripts
├── server.js            # Main server file
└── package.json         # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the documentation above
2. Review the code comments
3. Open an issue in the repository

## Default Credentials

- **Username**: admin
- **Email**: admin@example.com
- **Password**: admin123

⚠️ **Important**: Change the default password in production!

