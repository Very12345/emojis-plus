import sharp from 'sharp'

/** Global alpha envelope, in original pixels; never crop a GIF from just its first frame. */
export async function measureMaterial(bytes,{animated=false}={}){
 const meta=await sharp(bytes,{animated}).metadata(),width=meta.width,height=meta.pageHeight||meta.height,pages=meta.pages||1;
 if(!width||!height||width*height*pages>100_000_000)throw Error('Material exceeds the review pixel budget')
 const {data,info}=await sharp(bytes,{animated}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),channels=info.channels;
 let active=1,duration=0;if(animated){active=0;for(const delay of meta.delay||Array(pages).fill(100)){if(duration>=6000)break;duration+=Math.max(20,delay||100);active++}active=Math.max(1,Math.min(active,pages))}
 let left=width,top=height,right=0,bottom=0,pixels=0,transparent=false,bestArea=-1,poster=0;
 for(let frame=0;frame<active;frame++){let area=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const alpha=data[((frame*height+y)*width+x)*channels+channels-1];if(alpha<250)transparent=true;if(alpha>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);pixels++;area++}}if(area>bestArea){poster=frame;bestArea=area}}
 const valid=right>left&&bottom>top,bounds=valid?{x:left,y:top,width:right-left,height:bottom-top}:{x:0,y:0,width,height};
 return {bounds,has_transparency:transparent,empty:!valid,occupancy:Math.round(pixels/(width*height*active)*10000)/10000,poster_frame:poster,analyzed_frames:active,source_width:width,source_height:height}
}

/** Only alpha padding is removed. Opaque scene images and source masters are untouched. */
export function materialPipeline(bytes,metrics,{poster=false,animated=false}={}){
 let pipeline=sharp(bytes,animated?{page:metrics.poster_frame,pages:1}:{}).rotate();
 if(metrics.has_transparency&&!metrics.empty)pipeline=pipeline.extract({left:metrics.bounds.x,top:metrics.bounds.y,width:metrics.bounds.width,height:metrics.bounds.height});
 if(poster)return pipeline.resize({width:360,height:360,fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:12,bottom:12,left:12,right:12,background:{r:0,g:0,b:0,alpha:0}}).webp({quality:88,alphaQuality:100,effort:4});
 return pipeline.resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:5})
}
