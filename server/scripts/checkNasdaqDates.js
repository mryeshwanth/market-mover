const { pool } = require('../db/database');
const moment = require('moment-timezone');

async function checkNasdaqDates() {
    try {
        console.log('Checking NASDAQ opening and closing captures for Jan 5 and 6...\n');
        
        // Check NASDAQ opening for Jan 5
        const jan5OpenQuery = `
            SELECT 
                captured_at,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date as ist_date,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::date as et_date,
                capture_time,
                nasdaq,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as ist_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI:SS') as et_time
            FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = '2026-01-05'
            AND capture_time = 'nasdaq_opening'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at ASC
        `;
        
        const jan5OpenRes = await pool.query(jan5OpenQuery);
        console.log('NASDAQ Opening for Jan 5 (IST):');
        if (jan5OpenRes.rows.length > 0) {
            jan5OpenRes.rows.forEach(row => {
                console.log(`  - IST Date: ${row.ist_date}, IST Time: ${row.ist_time}, ET Date: ${row.et_date}, ET Time: ${row.et_time}, Price: ${row.nasdaq}`);
            });
        } else {
            console.log('  - No opening found for Jan 5');
        }
        
        // Check NASDAQ closing for Jan 6 (closing for Jan 5 US trading day happens on Jan 6 IST)
        const jan6CloseQuery = `
            SELECT 
                captured_at,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date as ist_date,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::date as et_date,
                capture_time,
                nasdaq,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as ist_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI:SS') as et_time
            FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = '2026-01-06'
            AND capture_time = 'nasdaq_closing'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at ASC
        `;
        
        const jan6CloseRes = await pool.query(jan6CloseQuery);
        console.log('\nNASDAQ Closing for Jan 6 (IST) - should be closing for Jan 5 US trading day:');
        if (jan6CloseRes.rows.length > 0) {
            jan6CloseRes.rows.forEach(row => {
                console.log(`  - IST Date: ${row.ist_date}, IST Time: ${row.ist_time}, ET Date: ${row.et_date}, ET Time: ${row.et_time}, Price: ${row.nasdaq}`);
            });
        } else {
            console.log('  - No closing found for Jan 6');
        }
        
        // Check NASDAQ opening for Jan 6
        const jan6OpenQuery = `
            SELECT 
                captured_at,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date as ist_date,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::date as et_date,
                capture_time,
                nasdaq,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as ist_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI:SS') as et_time
            FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = '2026-01-06'
            AND capture_time = 'nasdaq_opening'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at ASC
        `;
        
        const jan6OpenRes = await pool.query(jan6OpenQuery);
        console.log('\nNASDAQ Opening for Jan 6 (IST):');
        if (jan6OpenRes.rows.length > 0) {
            jan6OpenRes.rows.forEach(row => {
                console.log(`  - IST Date: ${row.ist_date}, IST Time: ${row.ist_time}, ET Date: ${row.et_date}, ET Time: ${row.et_time}, Price: ${row.nasdaq}`);
            });
        } else {
            console.log('  - No opening found for Jan 6');
        }
        
        // Check NASDAQ closing for Jan 7 (closing for Jan 6 US trading day happens on Jan 7 IST)
        const jan7CloseQuery = `
            SELECT 
                captured_at,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date as ist_date,
                (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::date as et_date,
                capture_time,
                nasdaq,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as ist_time,
                TO_CHAR(captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI:SS') as et_time
            FROM price_captures 
            WHERE (captured_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = '2026-01-07'
            AND capture_time = 'nasdaq_closing'
            AND nasdaq IS NOT NULL
            ORDER BY captured_at ASC
        `;
        
        const jan7CloseRes = await pool.query(jan7CloseQuery);
        console.log('\nNASDAQ Closing for Jan 7 (IST) - should be closing for Jan 6 US trading day:');
        if (jan7CloseRes.rows.length > 0) {
            jan7CloseRes.rows.forEach(row => {
                console.log(`  - IST Date: ${row.ist_date}, IST Time: ${row.ist_time}, ET Date: ${row.et_date}, ET Time: ${row.et_time}, Price: ${row.nasdaq}`);
            });
        } else {
            console.log('  - No closing found for Jan 7');
        }
        
        // Also check what the current logic would select
        console.log('\n=== What current logic would select ===');
        const today = moment.tz('Asia/Kolkata');
        const currentET = moment.tz(today.format('YYYY-MM-DD'), 'YYYY-MM-DD', 'America/New_York');
        console.log(`Current IST date: ${today.format('YYYY-MM-DD')}`);
        console.log(`Current ET date: ${currentET.format('YYYY-MM-DD')}`);
        console.log(`Current ET hour: ${currentET.hour()}, minute: ${currentET.minute()}`);
        
        let usTradingDay = currentET.clone().startOf('day');
        if (currentET.hour() < 9 || (currentET.hour() === 9 && currentET.minute() < 30)) {
            usTradingDay.subtract(1, 'day');
            while (usTradingDay.day() === 0 || usTradingDay.day() === 6) {
                usTradingDay.subtract(1, 'day');
            }
        }
        console.log(`Selected US trading day: ${usTradingDay.format('YYYY-MM-DD')}`);
        
        // Get opening IST date for this US trading day
        const openingISTDate = moment.tz(usTradingDay.format('YYYY-MM-DD'), 'YYYY-MM-DD', 'Asia/Kolkata');
        const closingISTDate = openingISTDate.clone().add(1, 'day');
        console.log(`Opening IST date to query: ${openingISTDate.format('YYYY-MM-DD')}`);
        console.log(`Closing IST date to query: ${closingISTDate.format('YYYY-MM-DD')}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkNasdaqDates();

