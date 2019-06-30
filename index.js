const express = require('express')
const moment = require('moment')
const google = require('googleapis')
const expressSession = require('express-session')
const cookieParser = require('cookie-parser')

require('dotenv').config()

const port = process.env.PORT || 3000
const app = express()

const googleAccounts = google.analytics('v3')
const googleAnalytics = google.analyticsreporting('v4')
let viewSelected

const clientID = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const callbackURL = 'http://localhost:3000/login/google/return'
const oauth2Client = new google.auth.OAuth2(clientID, clientSecret, callbackURL)
const url = oauth2Client.generateAuthUrl({
	access_type: 'online',
	scope: 'https://www.googleapis.com/auth/analytics.readonly'
})

app.use(express.static('views'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(expressSession({ secret: 'as!883@bnr$', resave: true, saveUninitialized: true }))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
})

app.get('/auth/google', (req, res) => {
	res.redirect(url)
})

app.get('/login/google/return', (req, res) => {
	oauth2Client.getToken(req.query.code, (err, tokens) => {
		viewSelected = ''
		if (!err) {
			oauth2Client.setCredentials({
				access_token: tokens.access_token
			})
			res.redirect('/setcookie')
		} else {
			console.log('Error: ' + err)
		}
	})
})

app.get('/setcookie', (req, res) => {
	res.cookie('google-auth', new Date())
	res.redirect('/success')
})

app.get('/success', (req, res) => {
	if (req.cookies['google-auth']) {
		res.sendFile(__dirname + '/views/success.html')
	} else {
		res.redirect('/')
	}
})

app.get('/clear', (req, res) => {
	viewSelected = ''
	res.redirect('/success')
})

app.get('/getData', function(req, res) {
	if (req.query.view) {
		viewSelected = req.query.view
	}
	if (!viewSelected) {
		googleAccounts.management.profiles.list(
			{
				accountId: '~all',
				webPropertyId: '~all',
				auth: oauth2Client
			},
			(err, data) => {
				if (err) {
					console.error('Error: ' + err)
					res.send('An error occurred')
				} else if (data) {
					let views = []
					data.items.forEach(view => {
						views.push({
							name: view.webPropertyId + ' - ' + view.name + ' (' + view.websiteUrl + ')',
							id: view.id
						})
					})
					res.send({ type: 'views', results: views })
				}
			}
		)
	} else {
		let now = moment().format('YYYY-MM-DD')
		let aMonthAgo = moment()
			.subtract(1, 'months')
			.format('YYYY-MM-DD')
		let repReq = [
			{
				viewId: viewSelected,
				dateRanges: [
					{
						startDate: aMonthAgo,
						endDate: now
					}
				],
				metrics: [
					{
						expression: 'ga:hits'
					}
				],
				dimensions: [
					{
						name: 'ga:day'
					}
				]
			}
		]

		googleAnalytics.reports.batchGet(
			{
				headers: {
					'Content-Type': 'application/json'
				},
				auth: oauth2Client,
				resource: {
					reportRequests: repReq
				}
			},
			(err, data) => {
				if (err) {
					console.error('Error: ' + err)
					res.send('An error occurred')
				} else if (data) {
					let views = []
					let max = 0
					data.reports[0].data.rows.forEach(view => {
						views.push(view.metrics[0].values[0])
						if (parseInt(view.metrics[0].values[0]) > parseInt(max)) max = view.metrics[0].values[0]
					})
					res.send([views, max])
				}
			}
		)
	}
})

// on clicking "logoff" the cookie is cleared
app.get('/logoff', (req, res) => {
	res.clearCookie('google-auth')
	res.redirect('/')
})

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`)
})
