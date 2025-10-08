const BASE_URL = 'http://127.0.0.1:8000';

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch data:", error);
        return null;
    }
}

async function postData(endpoint, data) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
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
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
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
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE'
        });
        if (!response.ok && response.status !== 204) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error("Could not delete data:", error);
        return false;
    }
}

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
