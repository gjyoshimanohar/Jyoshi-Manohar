const fs = require('fs');

function fixMargins() {
    let hero = fs.readFileSync('src/components/Hero.tsx', 'utf8');
    hero = hero.replace('pt-28 pb-16 lg:pt-40 lg:pb-24', 'pt-24 pb-10 lg:pt-32 lg:pb-16');
    fs.writeFileSync('src/components/Hero.tsx', hero);

    let services = fs.readFileSync('src/components/Services.tsx', 'utf8');
    services = services.replace('py-10', 'py-8');
    fs.writeFileSync('src/components/Services.tsx', services);

    let contact = fs.readFileSync('src/components/Contact.tsx', 'utf8');
    contact = contact.replace('py-10 lg:py-16', 'py-8 lg:py-10');
    fs.writeFileSync('src/components/Contact.tsx', contact);
}

fixMargins();
