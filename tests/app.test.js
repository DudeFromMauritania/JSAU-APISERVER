const request = require('supertest')
const app = require('../src/app')
const fs = require('fs').promises
const path = require('path')

jest.mock('@12313021/jsau-npmpackage', () => ({
    readFavorites: jest.fn(),
    writeFavorites: jest.fn(),
    searchFiles: jest.fn(),
    repositoryPath: '/mock/repository/path',
    stylesPath: '/mock/styles/path',
}))

const { readFavorites, writeFavorites, searchFiles, repositoryPath } = require('@12313021/jsau-npmpackage')

jest.mock('fs', () => ({
    promises: {
        access: jest.fn(),
        unlink: jest.fn(),
    },
}))

let server

beforeAll(() => {
    server = app.listen(8080)
})

beforeEach(() => {
    jest.clearAllMocks()
})

afterAll(() => {
    return new Promise((resolve) => server.close(resolve))
})

describe('GET /info', () => {
    it('should return application information', async () => {
        const response = await request(server).get('/info')
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            name: 'jsau-apiserver',
            version: '1.0.0',
        })
    })
})

describe('GET /favorites/:userId', () => {
    const userId = 'testUser'

    it('should return an empty array for a new user', async () => {
        readFavorites.mockResolvedValue({})

        const response = await request(server).get(`/favorites/${userId}`)
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual([])
    })

    it('should return user favorites', async () => {
        readFavorites.mockResolvedValue({
            [userId]: ['test.html'],
        })

        const response = await request(server).get(`/favorites/${userId}`)
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual(['test.html'])
    })
})

describe('POST /favorites/:userId/add', () => {
    const userId = 'testUser'
    const fileId = 'test.html'

    it('should add a file to favorites', async () => {
        fs.access.mockResolvedValue()
        readFavorites.mockResolvedValue({})
        writeFavorites.mockResolvedValue()

        const response = await request(server)
            .post(`/favorites/${userId}/add`)
            .send({ fileId })
            .set('Content-Type', 'application/json')

        expect(response.statusCode).toBe(200)
        expect(writeFavorites).toHaveBeenCalledWith({
            [userId]: [fileId],
        })
        expect(response.body).toEqual([fileId])
    })

    it('should return 400 if fileId is missing', async () => {
        const response = await request(server)
            .post(`/favorites/${userId}/add`)
            .send({})
            .set('Content-Type', 'application/json')

        expect(response.statusCode).toBe(400)
        expect(response.body).toHaveProperty('error', 'fileId is required')
    })

    it('should return 404 if the file does not exist', async () => {
        fs.access.mockRejectedValue({ code: 'ENOENT' })

        const response = await request(server)
            .post(`/favorites/${userId}/add`)
            .send({ fileId })
            .set('Content-Type', 'application/json')

        expect(response.statusCode).toBe(404)
        expect(response.body).toHaveProperty('error', 'File not found')
    })
})

describe('POST /favorites/:userId/remove', () => {
    const userId = 'testUser'
    const fileId = 'test.html'

    it('should remove a file from favorites', async () => {
        readFavorites.mockResolvedValue({
            [userId]: [fileId],
        })
        writeFavorites.mockResolvedValue()

        const response = await request(server)
            .post(`/favorites/${userId}/remove`)
            .send({ fileId })
            .set('Content-Type', 'application/json')

        expect(response.statusCode).toBe(200)
        expect(writeFavorites).toHaveBeenCalledWith({
            [userId]: [],
        })
        expect(response.body).toEqual([])
    })

    it('should return 400 if fileId is missing', async () => {
        const response = await request(server)
            .post(`/favorites/${userId}/remove`)
            .send({})
            .set('Content-Type', 'application/json')

        expect(response.statusCode).toBe(400)
        expect(response.body).toHaveProperty('error', 'fileId is required')
    })
})

describe('GET /search', () => {
    it('should return search results', async () => {
        const searchText = 'test'
        searchFiles.mockResolvedValue(['test.html'])

        const response = await request(server).get(`/search?text=${searchText}`)
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual(['test.html'])
    })

    it('should handle errors gracefully', async () => {
        searchFiles.mockRejectedValue(new Error('Test error'))

        const response = await request(server).get('/search?text=test')
        expect(response.statusCode).toBe(500)
        expect(response.text).toBe('Internal Server Error')
    })
})

describe('POST /endpoint', () => {
    it('should return JSON response', async () => {
        const response = await request(server)
            .post('/endpoint')
            .set('Content-Type', 'application/json')

        expect(response.statusCode).toBe(200)
        expect(response.body).toHaveProperty('message', 'JSON response')
    })
})
