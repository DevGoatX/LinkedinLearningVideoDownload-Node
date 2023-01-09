'use strict'

const puppeteer = require('puppeteer')
const fs = require('fs')
require('dotenv').config()
const axios = require('axios')

const downloadFolder = 'download'
const linkedInUrl = 'https://linkedin.com'
const learningURL = 'https://www.linkedin.com/learning/learning-solidworks-pcb/welcome?autoplay=true'

async function linkedinLogin(page) {
	await page.goto(linkedInUrl)

		await page.type('#session_key', process.env.EMAIL)
		await page.type('#session_password', process.env.PASSWORD)
		await page.click('.sign-in-form__submit-button')

		await page.waitForNavigation()
		await page.waitForTimeout(1000)

		await page.goto(learningURL)
		await page.waitForTimeout(1000)
}

async function downloadFile(url, filePath) {
	const response = await axios({
		method: 'GET',
		url: url,
		responseType: 'stream'
	})

	response.data.pipe(fs.createWriteStream(filePath))
	return new Promise((resolve, reject) => {
		response.data.on('end', () => {
			console.log('Download Completed')
			resolve()
		})

		response.data.on('error', err => {
			reject(err)
		})
	})
}

async function downloads(navigations) {

	const browser = await puppeteer.launch()
	const page = await browser.newPage()

	for (let section of navigations) {
		try {
			fs.mkdir(`${downloadFolder}/${section.title}`, { recursive: true}, (err) => {
				if (err) {
					throw err
				}
			})

			for (let item of section.items) {
				const url = linkedInUrl + item.url
				console.log('item url: ', url)
				await page.goto(url)
				await page.waitForTimeout(2000)

				const videoURL = await page.evaluate(() => {
					return document.getElementsByTagName('video')[0].getAttribute('src').replace('#.mp4', '')
				})

				console.log('video url: ', videoURL)
				await downloadFile(videoURL, `${downloadFolder}/${section.title}/${item.title}.mp4`)
			}

		} catch (e) {
			console.log('--------- error: ', e)
		}

	}
}

async function getDownloads() {
	try {

		const browser = await puppeteer.launch()

		const page = await browser.newPage()
		
		await linkedinLogin(page)

		const navigations = await page.evaluate(() => {
			const result = []
			const sections = document.getElementsByClassName('classroom-toc-section')

			for (let i = 0; i < sections.length - 1; i++) {
				const section = {
					title: '',
					items: []
				}
				const sectionTitle = sections[i].getElementsByClassName('classroom-toc-section__toggle-title')[0].textContent.replace('\n', '').trim()
				console.log(`${i + 1}th title: ${sectionTitle}`)

				section.title = sectionTitle
				
				const itemElements = sections[i].getElementsByTagName('li')
				for (let element of itemElements) {
					const title = element.getElementsByClassName('classroom-toc-item__title')[0].textContent.replace('\n', '').replace('(In progress)', '').replace('?', '').trim()
					const url = element.getElementsByTagName('a')[0].getAttribute('href')

					console.log(`element title: `, title)
					console.log(`element url: `, url)
					if (title == 'Welcome' || title == 'Chapter Quiz') {
						continue
					}

					section.items.push({
						title: title,
						url: url
					})
				}

				console.log('section: ', section)

				result.push(section)
			}

			return result
		})

		console.log('navigations: ', navigations)

		await downloads(navigations)
		await browser.close()

	} catch (error) {
		console.error(error)
	}
}

getDownloads()