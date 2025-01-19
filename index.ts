import 'dotenv/config'
import * as fs from 'node:fs';
import { CronJob } from 'cron';

import sb from 'skyblock.js'
import { EmbedBuilder } from 'discord.js'

const { DISCORD_WEBHOOK_URL } = process.env

if (!fs.existsSync('data.json')) {
    fs.writeFileSync('data.json', JSON.stringify({
        traders: [],
        totalScrap: 0,
    }, null, 4))
}

let data = JSON.parse(fs.readFileSync('data.json').toString())

const saveResponseToFile = (response: sb.Traders) => {
    const item = {
        timestamp: new Date().toISOString(),
        response,
    }
    data.traders.push(item)
    if (response.sellable.some( x => x.item == 'NETHERITE_SCRAP')) {
        data.totalScrap++;
        console.log(`[${new Date().toISOString()}] scrap!`);
    }
    
    fs.writeFileSync('data.json', JSON.stringify(data, null, 4))
}

const job = CronJob.from({
	cronTime: '5 1 * * * *',
	onTick: async function () {
        const traders = await sb.getTraders('skyblock')
        if (!traders?.active) return console.log(`[${new Date().toISOString()}] traders is inactive.`);
        
        saveResponseToFile(traders)
        
        const embed = new EmbedBuilder()
        embed.setTitle(`Trader Spawned!`);
        embed.setDescription(`Total traders so far: ${data.traders.length} / Total scrap: ${data.totalScrap}`)
        embed.addFields(...traders.buyable.map(item => {
            return {
                name: item.item,
                value: `Supply: **${item.maximumAmount}** (${item.maximumAmountPerPlayer}/player) - Cost: ${item.value}g`,
            }
        }))
        embed.setTimestamp(new Date());
        
        fetch(DISCORD_WEBHOOK_URL!, {
            body: JSON.stringify({
                // content: 't',
                embeds: [ embed.toJSON() ]
            }),
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