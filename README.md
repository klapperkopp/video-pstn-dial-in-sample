## Prerequisites:

- Node.js
- NPM

## Installation

1. Clone this repo

2. Change directory to this repo

3. In your terminal run: `npm install`

4. Run `cp config.js.example config.js` and update config.js with data from tokbox.com/account and dashboard.nexmo.com/applications

5. This only needs to be done on first setup, do either one of the following:

   1. Go to the application dashboard (dashboard.nexmo.com/applications) of your app (if you have none yet, create one with Voice enabled) and click "Generate Public and Private Key". This will download a private.key file, which you need to put in the root directory of this project.
   2. You can alternatively run `ssh-keygen -t rsa -b 4096 -m PEM -f private.key && openssl rsa -in private.key -pubout -outform PEM -out public.key.pub && nexmo app:update <YOUR_APP_ID> <YOUR_APP_NAME> --capabilities=voice --public-keyfile=public.key.pub` to generate a key file and update your app with that generated keyfile

6. The ngrok url and application data is automatically updated on each server start. We also link the phone number you provided as conference number. To start, run `npm start`
