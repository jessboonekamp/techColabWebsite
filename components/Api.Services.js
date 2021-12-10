module.exports = function(mailConfig, decryptor){

    if(typeof mailConfig !== 'object') throw new Error(`Invalid Mail Configuration. Must be an object.`);

    if(typeof decryptor !== 'function') throw new Error(`Invalid Decryptor. Must be a function.`);

    mailConfig.auth.pass = decryptor(mailConfig.auth.pass);
    console.log(8, mailConfig)

    return {

        newMailService: async function(){          
        
            const mailerService = require('nodemailer').createTransport(mailConfig);

            mailerService.on('error', e => console.log(e));

            if(!await mailerService.verify()) throw new Error(`Email Service verification issue. Check Gmail configuration.`)

            mailerService.send = async function(subject, html){
                await mailerService.sendMail({
                    from: this.options.auth.user,
                    to: [this.options.targetMailBox],
                    subject,
                    html
                })
            }

            return mailerService

        }
        
    }

}