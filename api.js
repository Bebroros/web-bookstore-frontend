const BASE_URL = 'http://127.0.0.1:8000';

async function refreshAccessToken() {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${BASE_URL}/api/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });

        const data = await response.json();
        sessionStorage.setItem('accessToken', data.access);
        return true;
    } catch (error) {
        return false;
    }
}

async function fetchData(endpoint) {
    const token = sessionStorage.getItem('accessToken');

    const settings = {
        headers: {}
    };

    if (token) {
        settings.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, settings);

        if (response.status === 401) {
            try {
                return await refreshAccessToken()
            } catch (error) {
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('username');
                window.location.hash = '/login';
                return null;
            }

        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch data:", error);
        return null;
    }
}

async function postData(endpoint, data) {
    try {
        const settings = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        };
        const token = sessionStorage.getItem('accessToken');
        if (token) {
            settings.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, settings);

        if (response.status === 401) {
            try {
                return await refreshAccessToken()
            } catch (e) {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('username');
            window.location.hash = '/login';
            return null; }
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not post data:", error);
        return null;
    }
}

async function updateData(endpoint, data) {
    const settings = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    }
    const token = sessionStorage.getItem('accessToken');
    if (token) {
        settings.headers['Authorization'] = `Bearer ${token}`;
    } else {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('username');
        window.location.hash = '/login';
        return null;
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, settings);

        if (response.status === 401) {
            try {
                return await refreshAccessToken()
            } catch (e) {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('username');
            window.location.hash = '/login';
            return null;}
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not update data:", error);
        return null;
    }
}

async function deleteData(endpoint) {
    const settings = {
        method: 'DELETE',
        headers: {}
    }
    const token = sessionStorage.getItem('accessToken');
    if (token) {
        settings.headers['Authorization'] = `Bearer ${token}`;
    } else {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('username');
        window.location.hash = '/login';
        return null;
    }
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, settings);

        if (response.status === 401) {
            try {
                return await refreshAccessToken()
            } catch (e) {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('username');
            window.location.hash = '/login';
            return null;}
        }

        if (!response.ok && response.status !== 204) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error("Could not delete data:", error);
        return false;
    }
}

export const login = (data) => postData('/auth/login/', data);
export const register = (data) => postData('/auth/register/', data);

export const getBooks = () => fetchData('/books/');
export const getBookById = (id) => fetchData(`/books/${id}/`);
export const createBook = (data) => postData('/books/', data);
export const updateBook = (id, data) => updateData(`/books/${id}/`, data);
export const deleteBook = (id) => deleteData(`/books/${id}/`);

export const getAuthors = () => fetchData('/authors/');
export const getAuthorById = (id) => fetchData(`/authors/${id}/`);
export const createAuthor = (data) => postData('/authors/', data);
export const updateAuthor = (id, data) => updateData(`/authors/${id}/`, data);
export const deleteAuthor = (id) => deleteData(`/authors/${id}/`);

export const getPublishers = () => fetchData('/publishers/');
export const getPublisherById = (id) => fetchData(`/publishers/${id}/`);
export const createPublisher = (data) => postData('/publishers/', data);
export const updatePublisher = (id, data) => updateData(`/publishers/${id}/`, data);
export const deletePublisher = (id) => deleteData(`/publishers/${id}/`);

export const getUserProfile = (id) => fetchData(`/users/${id}/`);
export const updateUserProfile = (id, data) => updateData(`/users/${id}/`, data);