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

export const getBooks = () => fetchData('/books');
export const getBookById = (id) => fetchData(`/books/${id}`);
export const getAuthors = () => fetchData('/authors');
export const getAuthorById = (id) => fetchData(`/authors/${id}`);
export const getPublishers = () => fetchData('/publishers');
export const getPublisherById = (id) => fetchData(`/publishers/${id}`);
