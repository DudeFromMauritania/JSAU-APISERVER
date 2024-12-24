

const express = require('express')
const fs = require('fs').promises
require('./config.js')
const path = require('path')
const morgan = require('morgan')
const {readFavorites, writeFavorites, searchFiles,repositoryPath,stylesPath} = require('@12313021/jsau-npmpackage')

const app = express()
app.use(morgan('dev'))
app.use(express.json())
app.use('/assets', express.static(path.dirname(stylesPath)));

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.send('Welcome to JSAU-APISERVER')
})

app.get('/info', (req, res) => {
    res.set('Cache-Control','private, max-age=600')
    res.json({
        name: 'jsau-apiserver',
        version: '1.0.0',
    })
})

app.get('/search', async(req, res) => {
    try {
        const searching = req.query.text
        const directory = repositoryPath
        const result = await searchFiles(directory, searching)
        res.set('Cache-Control', 'no-cache')
        res.json(result)
    } catch (error) {
        console.error('Error in GET /search:', error)
        res.status(500).send('Internal Server Error')
    }
})

app.get('/favorites/:userId', async(req, res) => {
    try {
        const {userId} = req.params
        const favorites = await readFavorites()
        res.setHeader('Cache-Control', 'private, max-age=300')
        res.setHeader('Vary', 'Cookie')
        res.json(favorites[userId] || [])
    } catch (error) {
        console.error('Error in GET /favorites/:userId:', error)
        res.status(500).send('Internal Server Error')
    }
})

app.post('/favorites/:userId/add', async(req, res) => {
    const {userId} = req.params
    const {fileId} = req.body

    if (!fileId) {
        return res.status(400).json({error: 'fileId is required'})
    }

    const filePath = path.join(repositoryPath,fileId)
    try {
        await fs.access(filePath)
    } catch (error) {
        return res.status(404).json({error: 'File not found'})
    }

    try {
        const favorites = await readFavorites()

        favorites[userId] = favorites[userId] || []
        if (!favorites[userId].includes(fileId)) {
            favorites[userId].push(fileId)
            await writeFavorites(favorites)
        }
        res.setHeader('Cache-Control', 'no-cache')
        res.status(200).json(favorites[userId])
    } catch (error) {
        res.status(500).json({error: 'Failed to update favorites'})
    }
})

app.post('/favorites/:userId/remove', async(req, res) => {
    try {
        const {userId} = req.params
        const {fileId} = req.body

        if (!fileId) {
            return res.status(400).json({error: 'fileId is required'})
        }

        const favorites = await readFavorites()

        if (favorites[userId]) {
            favorites[userId] = favorites[userId].filter((id) => id !== fileId)
            try {
                await writeFavorites(favorites)
            } catch (error) {
                console.error('Error writing favorites:', error)
                return res.status(500).json({error: 'Failed to update favorites'})
            }
        }

        res.set('Cache-Control', 'no-cache')
        res.json(favorites[userId] || [])
    } catch (error) {
        console.error('Unexpected error in POST /favorites/:userId/remove:', error)
        res.status(500).send('Internal Server Error')
    }
})
app.get('/download', async (req, res) => {
    const { file } = req.query
    if (!file) {
        return res.status(400).send('File path is required')
    }

    const filePath = path.join(repositoryPath, file)
    try {
        await fs.access(filePath)
        res.setHeader('Cache-Control', 'no-cache')
        res.download(filePath)
    } catch (error) {
        console.error('Error in /download:', error)
        res.status(404).send('File not found')
    }
})
app.post('/endpoint', (req, res) => {

    res.set('Cache-Control','private, max-age=300')
    res.json({message: 'JSON response'})
})

module.exports = app
