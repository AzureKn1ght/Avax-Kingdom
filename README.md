# Kingdom Cash 
Automatic daily claims bot  

[![KINGDOM CASH](http://img.youtube.com/vi/QHhzYdrPgAs/0.jpg)](http://www.youtube.com/watch?v=QHhzYdrPgAs "KINGDOM CASH")

**URLs:** \
https://www.avaxkingdom.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab \
https://www.optkingdom.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab \
https://www.matickingdom.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab \
https://www.kingdomcash.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab 

## ENV Variables 
You will need to create a file called *.env* in the root directory, copy the text in *.env.example* and fill in the variables. 
If you want to use the emailer, then you will need [Google App Passwords](https://support.google.com/accounts/answer/185833?hl=en). 

## How to Run
You could run it on your desktop just using [Node.js](https://github.com/nodejs/node) in your terminal. However, on a production environment, it is recommended to use something like [PM2](https://github.com/Unitech/pm2) to run the processes to ensure robust uptime and management. 
```
npm install
pm2 start avax.js -n "KING"
pm2 save

```
**Donate:** 0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab
