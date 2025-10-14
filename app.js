import * as api from './api.js';

const app = document.getElementById('app');
const navbarContainer = document.getElementById('navbar-container');

let allBooks = [];
let allAuthors = [];
let allPublishers = [];
let currentUser = null;

const isAuthenticated = () => {
    return !!sessionStorage.getItem('accessToken');
};

const getUsername = () => {
    return sessionStorage.getItem('username') || 'Користувач';
};

function jwtDecode(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

const isStaff = () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return false;
    const decoded = jwtDecode(token);
    return decoded && decoded.is_staff === true;
};

const getUserId = () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return null;
    const decoded = jwtDecode(token);
    return decoded ? decoded.user_id : null;
};

const createNavbar = () => {
    const authenticated = isAuthenticated();
    const username = getUsername();
    const staff = isStaff();

    return `
        <nav class="navbar">
            <a href="#/books" class="nav-brand">Книгарня 📚</a>
            <div class="nav-links">
                <a href="#/books">Книги</a>
                <a href="#/authors">Автори</a>
                <a href="#/publishers">Видавництва</a>
                ${authenticated && staff ? `
                    <a href="#/books/new" class="btn-add">+ Додати книгу</a>
                ` : ''}
                ${authenticated ? `
                    <a href="#/profile" class="username">👤 ${username}</a>
                    <button id="logout-btn" class="btn-logout">Вийти</button>
                ` : `
                    <a href="#/login" class="btn-login">Увійти</a>
                    <a href="#/register" class="btn-register">Реєстрація</a>
                `}
            </div>
        </nav>
    `;
};

const updateNavbar = () => {
    navbarContainer.innerHTML = createNavbar();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
};

const handleLogout = () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('username');
    currentUser = null;
    allBooks = [];
    allAuthors = [];
    allPublishers = [];
    updateNavbar();
    window.location.hash = '/books';
};

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
    const staff = isStaff();

    app.innerHTML = `
        <div class="detail-container">
            <div class="detail-header">
                <h1>${book.name}</h1>
                ${staff ? `
                    <div class="detail-actions">
                        <a href="#/books/edit/${book.id}" class="btn btn-edit">Редагувати</a>
                        <button class="btn btn-delete" id="delete-book-btn">Видалити</button>
                    </div>
                ` : ''}
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

    if (staff) {
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
}

async function renderAuthorListPage() {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    if (allAuthors.length === 0) {
        allAuthors = await api.getAuthors() || [];
    }
    const staff = isStaff();

    app.innerHTML = `
        <div class="detail-header">
            <h1>Автори</h1>
            ${staff ? `<a href="#/authors/new" class="btn btn-add">+ Додати автора</a>` : ''}
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

    const staff = isStaff();

    app.innerHTML = `
        <div class="detail-container">
            <div class="detail-header">
                <h1>${author.name}</h1>
                ${staff ? `
                    <div class="detail-actions">
                        <a href="#/authors/edit/${author.id}" class="btn btn-edit">Редагувати</a>
                        <button class="btn btn-delete" id="delete-author-btn">Видалити</button>
                    </div>
                ` : ''}
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

    if (staff) {
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
}

async function renderPublisherListPage() {
    app.innerHTML = `<div class="loader">Завантаження...</div>`;
    if (allPublishers.length === 0) {
        allPublishers = await api.getPublishers() || [];
    }
    const staff = isStaff();

    app.innerHTML = `
        <div class="detail-header">
            <h1>Видавництва</h1>
            ${staff ? `<a href="#/publishers/new" class="btn btn-add">+ Додати видавництво</a>` : ''}
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

    const staff = isStaff();

    app.innerHTML = `
        <div class="detail-container">
            <div class="detail-header">
                <h1>${publisher.name}</h1>
                ${staff ? `
                    <div class="detail-actions">
                        <a href="#/publishers/edit/${publisher.id}" class="btn btn-edit">Редагувати</a>
                        <button class="btn btn-delete" id="delete-publisher-btn">Видалити</button>
                    </div>
                ` : ''}
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

    if (staff) {
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
}

async function renderBookFormPage(id = null) {
    if (!isStaff()) {
        app.innerHTML = `<div class="error-message">Доступ заборонено. Тільки адміністратори можуть додавати та редагувати книги.</div>`;
        return;
    }

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
    if (!isStaff()) {
        app.innerHTML = `<div class="error-message">Доступ заборонено. Тільки адміністратори можуть додавати та редагувати авторів.</div>`;
        return;
    }

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
    if (!isStaff()) {
        app.innerHTML = `<div class="error-message">Доступ заборонено. Тільки адміністратори можуть додавати та редагувати видавництва.</div>`;
        return;
    }

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

async function renderLoginPage() {
    if (isAuthenticated()) {
        window.location.hash = '/books';
        return;
    }

    app.innerHTML = `
        <div class="detail-container">
            <h1>Вхід</h1>
            <form id="login-form" class="book-form">
                <div class="form-group">
                    <label for="username">Ім'я користувача</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Пароль</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div id="error-message" class="error-message" style="display: none;"></div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Увійти</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const errorDiv = document.getElementById('error-message');
        errorDiv.style.display = 'none';

        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
        };

        const result = await api.login(formData);

        if (result && result.access) {
            sessionStorage.setItem('accessToken', result.access);
            sessionStorage.setItem('refreshToken', result.refresh);
            sessionStorage.setItem('username', formData.username);
            updateNavbar();
        } else {
            errorDiv.textContent = 'Неправильне ім\'я користувача або пароль';
            errorDiv.style.display = 'block';
        }
    });
}

async function renderRegisterPage() {
    if (isAuthenticated()) {
        window.location.hash = '/books';
        return;
    }

    app.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <h1>Реєстрація</h1>
                <form id="register-form" class="auth-form">
                    <div class="form-group">
                        <label for="username">Ім'я користувача*</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Пошта*</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="first_name">Ім'я</label>
                        <input type="text" id="first_name" name="first_name" required>
                    </div>
                    <div class="form-group">
                        <label for="last_name">Прізвище</label>
                        <input type="text" id="last_name" name="last_name" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Пароль*</label>
                        <input type="password" id="password" name="password" required minlength="8">
                        <small>Мінімум 8 символів</small>
                    </div>
                    <div class="form-group">
                        <label for="password2">Підтвердіть пароль*</label>
                        <input type="password" id="password2" name="password2" required minlength="8">
                    </div>
                    <div id="error-message" class="error-message" style="display: none;"></div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary full-width">Зареєструватись</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const errorDiv = document.getElementById('error-message');
        errorDiv.style.display = 'none';

        const password = document.getElementById('password').value;
        const password2 = document.getElementById('password2').value;

        if (password !== password2) {
            errorDiv.textContent = 'Паролі не співпадають';
            errorDiv.style.display = 'block';
            return;
        }

        const formData = {
            username: document.getElementById('username').value,
            password: password,
            password2: password2,
            email: document.getElementById('email').value,
            first_name: document.getElementById('first_name').value,
            last_name: document.getElementById('last_name').value
        };

        const result = await api.register(formData);

        if (result) {
            alert('Реєстрація успішна.');
            window.location.hash = '/login';
        } else {
            errorDiv.textContent = 'Помилка реєстрації.';
            errorDiv.style.display = 'block';
        }
    });
}

async function renderProfilePage() {
    if (!isAuthenticated()) {
        window.location.hash = '/login';
        return;
    }

    app.innerHTML = `<div class="loader">Завантаження...</div>`;

    const userId = getUserId();
    if (!userId) {
        app.innerHTML = `<div class="error-message">Не вдалося визначити користувача.</div>`;
        return;
    }

    const userProfile = await api.getUserProfile(userId);

    if (!userProfile) {
        app.innerHTML = `<div class="error-message">Не вдалося завантажити профіль.</div>`;
        return;
    }

    const isEditing = sessionStorage.getItem('editingProfile') === 'true';

    if (isEditing) {
        app.innerHTML = `
            <div class="detail-container">
                <h1>Редагувати профіль</h1>
                <form id="profile-form" class="book-form">
                    <div class="form-group">
                        <label for="username">Ім'я користувача</label>
                        <input type="text" id="username" name="username" value="${userProfile.username}" disabled>
                    </div>

                    <div class="form-group">
                        <label for="first_name">Ім'я</label>
                        <input type="text" id="first_name" name="first_name" value="${userProfile.first_name || ''}">
                    </div>

                    <div class="form-group">
                        <label for="last_name">Прізвище</label>
                        <input type="text" id="last_name" name="last_name" value="${userProfile.last_name || ''}">
                    </div>

                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" value="${userProfile.email || ''}">
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Зберегти</button>
                        <button type="button" id="cancel-btn" class="btn btn-secondary">Скасувати</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('cancel-btn').addEventListener('click', () => {
            sessionStorage.removeItem('editingProfile');
            renderProfilePage();
        });

        document.getElementById('profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                first_name: document.getElementById('first_name').value,
                last_name: document.getElementById('last_name').value,
                email: document.getElementById('email').value,
            };

            const result = await api.updateUserProfile(userId, formData);

            if (result) {
                sessionStorage.removeItem('editingProfile');
                alert('Профіль успішно оновлено!');
                renderProfilePage();
            } else {
                alert('Помилка при оновленні профілю');
            }
        });
    } else {
        app.innerHTML = `
            <div class="detail-container">
                <div class="detail-header">
                    <h1>Мій профіль</h1>
                    <button id="edit-profile-btn" class="btn btn-edit">Редагувати</button>
                </div>

                <div class="profile-info">
                    <div class="form-group">
                        <label>Ім'я користувача</label>
                        <p>${userProfile.username}</p>
                    </div>

                    <div class="form-group">
                        <label>Ім'я</label>
                        <p>${userProfile.first_name || 'Не вказано'}</p>
                    </div>

                    <div class="form-group">
                        <label>Прізвище</label>
                        <p>${userProfile.last_name || 'Не вказано'}</p>
                    </div>

                    <div class="form-group">
                        <label>Email</label>
                        <p>${userProfile.email || 'Не вказано'}</p>
                    </div>
                </div>

                <a href="#/books">← Повернутися до книг</a>
            </div>
        `;

        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            sessionStorage.setItem('editingProfile', 'true');
            renderProfilePage();
        });
    }
}

const routes = {
    '/books': renderBookListPage,
    '/authors': renderAuthorListPage,
    '/publishers': renderPublisherListPage,
    '/login': renderLoginPage,
    '/register': renderRegisterPage,
    '/profile': renderProfilePage,
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
        window.location.hash = '/login';
    }
}

updateNavbar();

window.addEventListener('hashchange', () => {
    router();
    updateNavbar();
});

window.addEventListener('load', () => {

    router();
    updateNavbar();
});