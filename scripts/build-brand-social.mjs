import { ImageResponse } from 'next/og.js'
import { createElement as h } from 'react'
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
const image = 'data:image/png;base64,' + (await readFile('public/assets/logo/mascot-original.png')).toString('base64')
const response = new ImageResponse(h('div', {style:{display:'flex',width:'100%',height:'100%',background:'#f7f8f2',color:'#294e48',padding:'70px',alignItems:'center',gap:'48px'}},
  h('div',{style:{display:'flex',flexDirection:'column',flex:1}},
    h('div',{style:{display:'flex',fontSize:30,marginBottom:32}},'Vynta · finanças e rotina'),
    h('div',{style:{display:'flex',fontSize:58,fontWeight:700,lineHeight:1.1,letterSpacing:-2}},'Saiba quanto sobra antes do mês acabar.'),
    h('div',{style:{display:'flex',fontSize:24,marginTop:32}},'7 dias grátis. Sem cartão.')),
  h('img',{src:image,width:350,height:350,style:{borderRadius:40}})
), {width:1200,height:630})
await sharp(Buffer.from(await response.arrayBuffer())).jpeg({quality:92}).toFile('public/images/landing/og.jpg')
console.log('Open Graph image exported: 1200×630')
