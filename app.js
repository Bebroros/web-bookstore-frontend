import * as api from './api.js';

const app = document.getElementById('app');
const navbarContainer = document.getElementById('navbar-container');

let allBooks = [];
let allAuthors = [];
let allPublishers = [];

const createNavbar = () => `
    <nav class="navbar">
        <a href="#/books" class="nav-brand">Книгарня 📚</a>
        <div class="nav-links">
            <a href="#/books">Книги</a>
            <a href="#/authors">Автори</a>
            <a href="#/publishers">Видавництва</a>
        </div>
    </nav>
`;

const createBookCard = (book) => `
    <div class="card">
        <a href="#/books/${book.id}">
            <h3>${book.name}</h3>
        </a>
        <a href="#/authors/${book.author}" class="card-author">${book.authorName || 'Невідомий автор'}</a>
        <p class="card-price">${book.price} грн</p>
    </div>
`;

const createAuthorCard = (author) => `
    <a href="#/authors/${author.id}" class="card">
        <h3>${author.name}</h3>
        <p>Кількість книг: ${author.books.length}</p>
    </a>
`;

const createPublisherCard = (publisher) => `
    <a href="#/publishers/${publisher.id}" class="card">
        <h3>${publisher.name}</h3>
        <p>Кількість книг: ${publisher.books.length}</p>
    </a>
`;

async function renderBookListPage() {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    
    if (allBooks.length === 0) {
        allBooks = await api.getBooks() || [];
    }
    
    if (allAuthors.length === 0) {
        allAuthors = await api.getAuthors() || [];
    }
    
    const authorsMap = {};
    allAuthors.forEach(author => {
        authorsMap[author.id] = author.name;
    });
    
    allBooks.forEach(book => {
        book.authorName = authorsMap[book.author] || 'Невідомий автор';
    });

    const genres = ['all', ...new Set(allBooks.map(b => b.genre))];
    
    app.innerHTML = `
        <h1>Каталог книг</h1>
        <div class="controls">
            <input type="text" id="search" placeholder="Пошук за назвою або автором...">
            <select id="genre-filter">
                ${genres.map(g => `<option value="${g}">${g === 'all' ? 'Всі жанри' : g}</option>`).join('')}
            </select>
            <select id="sort">
                <option value="popularity">За популярністю</option>
                <option value="price_asc">Від дешевших</option>
                <option value="price_desc">Від дорожчих</option>
            </select>
        </div>
        <div class="grid" id="book-grid"></div>
    `;

    const bookGrid = document.getElementById('book-grid');
    const searchInput = document.getElementById('search');
    const genreFilter = document.getElementById('genre-filter');
    const sortSelect = document.getElementById('sort');

    const displayBooks = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedGenre = genreFilter.value;
        const sortKey = sortSelect.value;

        let booksToDisplay = allBooks
            .filter(book => 
                book.name.toLowerCase().includes(searchTerm) ||
                (book.authorName && book.authorName.toLowerCase().includes(searchTerm))
            )
            .filter(book => 
                selectedGenre === 'all' || book.genre === selectedGenre
            );
        
        booksToDisplay.sort((a, b) => {
            switch (sortKey) {
                case 'price_asc': return a.price - b.price;
                case 'price_desc': return b.price - a.price;
                default: return b.popularity - a.popularity;
            }
        });

        bookGrid.innerHTML = booksToDisplay.map(createBookCard).join('');
    };

    searchInput.addEventListener('input', displayBooks);
    genreFilter.addEventListener('change', displayBooks);
    sortSelect.addEventListener('change', displayBooks);
    
    displayBooks();
}

async function renderBookDetailPage(id) {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    const book = await api.getBookById(id);

    if (!book) {
        app.innerHTML = `<div class="error-message">Книгу не знайдено.</div>`;
        return;
    }

    const author = await api.getAuthorById(book.author);
    const publisher = await api.getPublisherById(book.publisher);

    app.innerHTML = `
        <div class="detail-container">
            <h1>${book.name}</h1>
            <h3>Автор: <a href="#/authors/${book.author}">${author ? author.name : 'Невідомий автор'}</a></h3>
            <div class="meta-info">
                <p><strong>Жанр:</strong> ${book.genre}</p>
                <p><strong>Рік:</strong> ${book.year}</p>
                <p><strong>Видавництво:</strong> <a href="#/publishers/${book.publisher}">${publisher ? publisher.name : 'Невідоме видавництво'}</a></p>
                <p><strong>Ціна:</strong> <span class="card-price">${book.price} грн</span></p>
            </div>
            <h2>Опис</h2>
            <p>${book.description}</p>
            <a href="#/books">← Повернутися до списку книг</a>
        </div>
    `;
}

async function renderAuthorListPage() {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    if (allAuthors.length === 0) {
        allAuthors = await api.getAuthors() || [];
    }
    app.innerHTML = `
        <h1>Автори</h1>
        <div class="grid">
            ${allAuthors.map(createAuthorCard).join('')}
        </div>
    `;
}

async function renderAuthorDetailPage(id) {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    const author = await api.getAuthorById(id);

    if (!author) {
        app.innerHTML = `<div class="error-message">Автора не знайдено.</div>`;
        return;
    }

    let validBooks = [];
    if (author.books && author.books.length > 0) {
        const bookDetailsPromises = author.books.map(bookId => api.getBookById(bookId));
        const books = await Promise.all(bookDetailsPromises);
        validBooks = books.filter(book => book !== null);
    }

    app.innerHTML = `
        <div class="detail-container">
            <h1>${author.name}</h1>
            <h2>Біографія</h2>
            <p>${author.description || 'Опис відсутній.'}</p>
            <hr/>
            <h2>Книги автора</h2>
            ${validBooks.length > 0 ? `
                <div class="grid">
                    ${validBooks.map(createBookCard).join('')}
                </div>
            ` : '<p>У цього автора поки немає книг.</p>'}
            <br>
            <a href="#/authors">← Повернутися до списку авторів</a>
        </div>
    `;
}

async function renderPublisherListPage() {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    if (allPublishers.length === 0) {
        allPublishers = await api.getPublishers() || [];
    }
    app.innerHTML = `
        <h1>Видавництва</h1>
        <div class="grid">
            ${allPublishers.map(createPublisherCard).join('')}
        </div>
    `;
}

async function renderPublisherDetailPage(id) {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    const publisher = await api.getPublisherById(id);

    if (!publisher) {
        app.innerHTML = `<div class="error-message">Видавництво не знайдено.</div>`;
        return;
    }

    let validBooks = [];
    if (publisher.books && publisher.books.length > 0) {
        const bookDetailsPromises = publisher.books.map(bookId => api.getBookById(bookId));
        const books = await Promise.all(bookDetailsPromises);
        validBooks = books.filter(book => book !== null);
    }

    app.innerHTML = `
        <div class="detail-container">
            <h1>${publisher.name}</h1>
            <h2>Про видавництво</h2>
            <p>${publisher.description || 'Опис відсутній.'}</p>
            <hr/>
            <h2>Книги видавництва</h2>
            ${validBooks.length > 0 ? `
                <div class="grid">
                    ${validBooks.map(createBookCard).join('')}
                </div>
            ` : '<p>У цього видавництва поки немає книг.</p>'}
            <br>
            <a href="#/publishers">← Повернутися до списку видавництв</a>
        </div>
    `;
}

const routes = {
    '/books': renderBookListPage,
    '/authors': renderAuthorListPage,
    '/publishers': renderPublisherListPage,
};

function router() {
    const path = window.location.hash.slice(1) || '/books';
    const bookDetailMatch = path.match(/^\/books\/(\d+)$/);
    const authorDetailMatch = path.match(/^\/authors\/(\d+)$/);
    const publisherDetailMatch = path.match(/^\/publishers\/(\d+)$/);

    if (bookDetailMatch) {
        renderBookDetailPage(bookDetailMatch[1]);
    } else if (authorDetailMatch) {
        renderAuthorDetailPage(authorDetailMatch[1]);
    } else if (publisherDetailMatch) {
        renderPublisherDetailPage(publisherDetailMatch[1]);
    } else if (routes[path]) {
        routes[path]();
    } else {
        window.location.hash = '/books';
    }
}

navbarContainer.innerHTML = createNavbar();

window.addEventListener('hashchange', router);
window.addEventListener('load', router);
