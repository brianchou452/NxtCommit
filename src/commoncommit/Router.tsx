import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { I18nProvider } from './src/i18n/index.js';
import { AppProvider } from './src/state/AppContext.js';
import App from './src/App.js';
import Home from './src/pages/Home.js';
import { NotFound, RouteError } from './src/pages/RouteFallbacks.js';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import './src/styles.css';
const Mission=lazy(()=>import('./src/pages/MissionDetail.js'));
const Run=lazy(()=>import('./src/pages/ExecutionRoom.js'));
const Review=lazy(()=>import('./src/pages/Review.js'));
const Profile=lazy(()=>import('./src/pages/Profile.js'));
const New=lazy(()=>import('./src/pages/NewMission.js'));
const Demo=lazy(()=>import('./src/pages/Demo.js'));
const Market=lazy(()=>import('./src/pages/Marketplace.js'));
const Concepts=lazy(()=>import('./src/pages/DesignConcept.js'));
const Advanced=lazy(()=>import('./Advanced.js'));
const wrap=(child:React.ReactNode)=><Suspense fallback={<div role="status" className="p-12">…</div>}>{child}</Suspense>;
const router=createBrowserRouter([
 {path:'/concepts/:concept/*',element:wrap(<Concepts/>),errorElement:<RouteError/>},
 {path:'/',element:<App/>,errorElement:<RouteError/>,children:[
  {index:true,element:<Home/>},{path:'marketplace',element:wrap(<Market/>)},{path:'demo',element:wrap(<Demo/>)},
  {path:'new',element:wrap(<New/>)},{path:'missions/:id',element:wrap(<Mission/>)},{path:'missions/:id/run',element:wrap(<Run/>)},
  {path:'missions/:id/review',element:wrap(<Review/>)},{path:'contributors/:id',element:wrap(<Profile/>)},
  {path:'assurance',element:wrap(<Advanced kind="assurance"/>)},{path:'github',element:wrap(<Advanced kind="github"/>)},
  {path:'*',element:<NotFound/>}]}]);
export function CommoncommitRouter(){return <I18nProvider><AppProvider><RouterProvider router={router}/></AppProvider></I18nProvider>;}
