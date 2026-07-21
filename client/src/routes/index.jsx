/* oxlint-disable react/only-export-components */
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import Loading from '../components/Loading';

// Lazy load pages for code splitting & better bundle size optimization
const Home = lazy(() => import('../pages/Home'));
const LocationLanding = lazy(() => import('../pages/LocationLanding'));
const NavigationMap = lazy(() => import('../pages/NavigationMap'));
const AdminLogin = lazy(() => import('../pages/AdminLogin'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Loader helper for lazy pages
const withSuspense = (Component) => (
  <Suspense fallback={<Loading fullScreen={false} />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: withSuspense(Home),
      },
      {
        path: 'location/:locationId',
        element: withSuspense(LocationLanding),
      },
      {
        path: 'map/:locationId',
        element: withSuspense(NavigationMap),
      },
      {
        path: 'admin',
        element: <Navigate to="/admin/login" replace />,
      },
      {
        path: 'admin/login',
        element: withSuspense(AdminLogin),
      },
      {
        path: 'admin/dashboard',
        element: withSuspense(AdminDashboard),
      },
      {
        path: '*',
        element: withSuspense(NotFound),
      },
    ],
  },
]);
