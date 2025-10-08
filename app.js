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
            <a href="#/books/new" class="btn-add">+ Додати книгу</a>
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
            <div class="detail-header">
                <h1>${book.name}</h1>
                <div class="detail-actions">
                    <a href="#/books/edit/${book.id}" class="btn btn-edit">Редагувати</a>
                    <button class="btn btn-delete" id="delete-book-btn">Видалити</button>
                </div>
            </div>
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

    document.getElementById('delete-book-btn').addEventListener('click', async () => {
        if (confirm('Ви впевнені, що хочете видалити цю книгу?')) {
            const success = await api.deleteBook(id);
            if (success) {
                allBooks = [];
                window.location.hash = '/books';
            } else {
                alert('Помилка при видаленні книги');
            }
        }
    });
}

async function renderAuthorListPage() {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    if (allAuthors.length === 0) {
        allAuthors = await api.getAuthors() || [];
    }
    app.innerHTML = `
        <div class="detail-header">
            <h1>Автори</h1>
            <a href="#/authors/new" class="btn btn-add">+ Додати автора</a>
        </div>
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
            <div class="detail-header">
                <h1>${author.name}</h1>
                <div class="detail-actions">
                    <a href="#/authors/edit/${author.id}" class="btn btn-edit">Редагувати</a>
                    <button class="btn btn-delete" id="delete-author-btn">Видалити</button>
                </div>
            </div>
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

    document.getElementById('delete-author-btn').addEventListener('click', async () => {
        if (confirm('Ви впевнені, що хочете видалити цього автора?')) {
            const success = await api.deleteAuthor(id);
            if (success) {
                allAuthors = [];
                window.location.hash = '/authors';
            } else {
                alert('Помилка при видаленні автора');
            }
        }
    });
}

async function renderPublisherListPage() {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    if (allPublishers.length === 0) {
        allPublishers = await api.getPublishers() || [];
    }
    app.innerHTML = `
        <div class="detail-header">
            <h1>Видавництва</h1>
            <a href="#/publishers/new" class="btn btn-add">+ Додати видавництво</a>
        </div>
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
            <div class="detail-header">
                <h1>${publisher.name}</h1>
                <div class="detail-actions">
                    <a href="#/publishers/edit/${publisher.id}" class="btn btn-edit">Редагувати</a>
                    <button class="btn btn-delete" id="delete-publisher-btn">Видалити</button>
                </div>
            </div>
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

    document.getElementById('delete-publisher-btn').addEventListener('click', async () => {
        if (confirm('Ви впевнені, що хочете видалити це видавництво?')) {
            const success = await api.deletePublisher(id);
            if (success) {
                allPublishers = [];
                window.location.hash = '/publishers';
            } else {
                alert('Помилка при видаленні видавництва');
            }
        }
    });
}

async function renderBookFormPage(id = null) {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    
    if (allAuthors.length === 0) {
        allAuthors = await api.getAuthors() || [];
    }
    if (allPublishers.length === 0) {
        allPublishers = await api.getPublishers() || [];
    }

    let book = null;
    if (id) {
        book = await api.getBookById(id);
        if (!book) {
            app.innerHTML = `<div class="error-message">Книгу не знайдено.</div>`;
            return;
        }
    }

    const isEdit = book !== null;

    app.innerHTML = `
        <div class="detail-container">
            <h1>${isEdit ? 'Редагувати книгу' : 'Додати нову книгу'}</h1>
            <form id="book-form" class="book-form">
                <div class="form-group">
                    <label for="name">Назва*</label>
                    <input type="text" id="name" name="name" required value="${book ? book.name : ''}">
                </div>

                <div class="form-group">
                    <label for="description">Опис*</label>
                    <textarea id="description" name="description" required rows="5">${book ? book.description : ''}</textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="genre">Жанр*</label>
                        <input type="text" id="genre" name="genre" required value="${book ? book.genre : ''}">
                    </div>

                    <div class="form-group">
                        <label for="year">Рік*</label>
                        <input type="number" id="year" name="year" required min="1000" max="2100" value="${book ? book.year : ''}">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="author_id">Автор*</label>
                        <select id="author_id" name="author_id" required>
                            <option value="">Оберіть автора</option>
                            ${allAuthors.map(author => `
                                <option value="${author.id}" ${book && book.author === author.id ? 'selected' : ''}>
                                    ${author.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="publisher">Видавництво*</label>
                        <select id="publisher" name="publisher" required>
                            <option value="">Оберіть видавництво</option>
                            ${allPublishers.map(publisher => `
                                <option value="${publisher.id}" ${book && book.publisher === publisher.id ? 'selected' : ''}>
                                    ${publisher.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="price">Ціна (грн)*</label>
                    <input type="number" id="price" name="price" required min="0" step="0.01" value="${book ? book.price : ''}">
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Зберегти зміни' : 'Додати книгу'}</button>
                    <a href="${isEdit ? `#/books/${id}` : '#/books'}" class="btn btn-secondary">Скасувати</a>
                </div>
            </form>
        </div>
    `;

    document.getElementById('book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            description: document.getElementById('description').value,
            genre: document.getElementById('genre').value,
            year: parseInt(document.getElementById('year').value),
            author: parseInt(document.getElementById('author_id').value),
            publisher: parseInt(document.getElementById('publisher').value),
            price: parseInt(document.getElementById('price').value)
        };

        let result;
        if (isEdit) {
            result = await api.updateBook(id, formData);
        } else {
            result = await api.createBook(formData);
        }

        if (result) {
            allBooks = [];
            window.location.hash = isEdit ? `/books/${id}` : `/books/${result.id}`;
        } else {
            alert('Помилка при збереженні книги');
        }
    });
}

async function renderAuthorFormPage(id = null) {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    
    let author = null;
    if (id) {
        author = await api.getAuthorById(id);
        if (!author) {
            app.innerHTML = `<div class="error-message">Автора не знайдено.</div>`;
            return;
        }
    }

    const isEdit = author !== null;

    app.innerHTML = `
        <div class="detail-container">
            <h1>${isEdit ? 'Редагувати автора' : 'Додати нового автора'}</h1>
            <form id="author-form" class="book-form">
                <div class="form-group">
                    <label for="name">Ім'я*</label>
                    <input type="text" id="name" name="name" required value="${author ? author.name : ''}">
                </div>

                <div class="form-group">
                    <label for="description">Біографія*</label>
                    <textarea id="description" name="description" required rows="8">${author ? author.description : ''}</textarea>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Зберегти зміни' : 'Додати автора'}</button>
                    <a href="${isEdit ? `#/authors/${id}` : '#/authors'}" class="btn btn-secondary">Скасувати</a>
                </div>
            </form>
        </div>
    `;

    document.getElementById('author-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            description: document.getElementById('description').value,
            books: author ? author.books : []
        };

        let result;
        if (isEdit) {
            result = await api.updateAuthor(id, formData);
        } else {
            result = await api.createAuthor(formData);
        }

        if (result) {
            allAuthors = [];
            window.location.hash = isEdit ? `/authors/${id}` : `/authors/${result.id}`;
        } else {
            alert('Помилка при збереженні автора');
        }
    });
}

async function renderPublisherFormPage(id = null) {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    
    let publisher = null;
    if (id) {
        publisher = await api.getPublisherById(id);
        if (!publisher) {
            app.innerHTML = `<div class="error-message">Видавництво не знайдено.</div>`;
            return;
        }
    }

    const isEdit = publisher !== null;

    app.innerHTML = `
        <div class="detail-container">
            <h1>${isEdit ? 'Редагувати видавництво' : 'Додати нове видавництво'}</h1>
            <form id="publisher-form" class="book-form">
                <div class="form-group">
                    <label for="name">Назва*</label>
                    <input type="text" id="name" name="name" required value="${publisher ? publisher.name : ''}">
                </div>

                <div class="form-group">
                    <label for="description">Опис*</label>
                    <textarea id="description" name="description" required rows="8">${publisher ? publisher.description : ''}</textarea>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Зберегти зміни' : 'Додати видавництво'}</button>
                    <a href="${isEdit ? `#/publishers/${id}` : '#/publishers'}" class="btn btn-secondary">Скасувати</a>
                </div>
            </form>
        </div>
    `;

    document.getElementById('publisher-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            description: document.getElementById('description').value,
            books: publisher ? publisher.books : []
        };

        let result;
        if (isEdit) {
            result = await api.updatePublisher(id, formData);
        } else {
            result = await api.createPublisher(formData);
        }

        if (result) {
            allPublishers = [];
            window.location.hash = isEdit ? `/publishers/${id}` : `/publishers/${result.id}`;
        } else {
            alert('Помилка при збереженні видавництва');
        }
    });
}

const routes = {
    '/books': renderBookListPage,
    '/authors': renderAuthorListPage,
    '/publishers': renderPublisherListPage,
};

function router() {
    const path = window.location.hash.slice(1) || '/books';
    const bookDetailMatch = path.match(/^\/books\/(\d+)$/);
    const bookEditMatch = path.match(/^\/books\/edit\/(\d+)$/);
    const authorDetailMatch = path.match(/^\/authors\/(\d+)$/);
    const authorEditMatch = path.match(/^\/authors\/edit\/(\d+)$/);
    const publisherDetailMatch = path.match(/^\/publishers\/(\d+)$/);
    const publisherEditMatch = path.match(/^\/publishers\/edit\/(\d+)$/);

    if (path === '/books/new') {
        renderBookFormPage();
    } else if (path === '/authors/new') {
        renderAuthorFormPage();
    } else if (path === '/publishers/new') {
        renderPublisherFormPage();
    } else if (bookEditMatch) {
        renderBookFormPage(bookEditMatch[1]);
    } else if (authorEditMatch) {
        renderAuthorFormPage(authorEditMatch[1]);
    } else if (publisherEditMatch) {
        renderPublisherFormPage(publisherEditMatch[1]);
    } else if (bookDetailMatch) {
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
