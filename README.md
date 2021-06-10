
## Prerequisites:

* Node.js
* NPM

## Installation

1. Clone this repo

2. Change directory to the sample project

3. In your terminal run: `npm install`

4. ngrok http 4001

5. Update config.js with ngrok url in server url

6. run command `nexmo app:list` to list apps and copy application id

7. run command `nexmo app:update d6372239-d4ea-4620-bb43-23243deaaec4 "nexmo-korber" https://3600a3d7c1d4.ngrok.io/nexmo-answer https://3600a3d7c1d4.ngrok.io/nexmo-events` to add urls in the app

8. `nexmo link:app 498944259915 d6372239-d4ea-4620-bb43-23243deaaec4` link phone number bought with the application