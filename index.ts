import 'dotenv/config'
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises'
import { CronJob } from 'cron';

import sb from 'skyblock.js'
import { EmbedBuilder } from 'discord.js'

const { DISCORD_WEBHOOK_URL, NOTIFICATION_ROLE_ID } = process.env

if (!fs.existsSync('data.json')) {
    fs.writeFileSync('data.json', JSON.stringify({
        traders: [],
        totalScrap: 0,
    }, null, 4))
}

let data = JSON.parse(fs.readFileSync('data.json').toString())

const saveResponseToFile = (response: sb.Traders): Promise<boolean> => {
    return new Promise(async (resolve) => {
        let returnValue = false
        const item = {
            timestamp: new Date().toISOString(),
            response,
        }
        data.traders.push(item)
        if (response.buyable.some( x => x.item == 'NETHERITE_SCRAP')) {
            data.totalScrap++;
            console.log(`[${new Date().toISOString()}] scrap!`);
            returnValue = true
        }
        
        await fsp.writeFile('data.json', JSON.stringify(data, null, 4))
        resolve(returnValue)
    })
}

let lastTraderId = 0;

const job = CronJob.from({
	cronTime: '5 1 * * * *',
	onTick: async function () {
        const traders = await sb.getTraders('skyblock')
        if (traders?.entityId == lastTraderId) return;
        lastTraderId = traders?.entityId ?? 0
        
        if (!traders?.active) return console.log(`[${new Date().toISOString()}] traders is inactive.`);
        
        const isScrap = await saveResponseToFile(traders)
        
        const embed = new EmbedBuilder()
        embed.setTitle(`Trader Spawned!`);
        embed.setDescription(`Total traders so far: ${data.traders.length} / Total scrap: ${data.totalScrap}`)
        embed.addFields(...traders.buyable.map(item => {
            return {
                name: item.item,
                value: `Supply: **${item.maximumAmount}** (${item.maximumAmountPerPlayer}/player) - Cost: **${item.value}g**`,
            }
        }))
        embed.setTimestamp(new Date());
        
        const webBody = {
            embeds: [ embed.toJSON() ]
        } as { embeds: any[], content?: string}

        if (isScrap) webBody.content = `<@&${NOTIFICATION_ROLE_ID}>`

        fetch(DISCORD_WEBHOOK_URL!, {
            body: JSON.stringify(webBody),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
        })

	},
	start: true,
	timeZone: 'utc'
});

job.start();