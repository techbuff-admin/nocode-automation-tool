// renderer/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import { ChatProvider } from './context/ChatContext';
import { ProjectProvider } from './context/ProjectContext';
import ProjectSetup from './pages/ProjectSetup';
import Projects from './pages/Projects';
import MetaEditor from './components/MetaEditor';

// import page components
import Home from './pages/Home';
import Generate from './pages/Generate';
import Actions from './pages/Actions';
import Suite from './pages/Suite';

function AppRoutes() {
  const { token } = React.useContext(AuthContext);

  // If not authenticated, always go to /login
  if (!token) {
    return <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>;
  }

  // Authenticated routes live inside the Layout
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meta" element={<MetaEditor />} />
        <Route path="/project-setup" element={<ProjectSetup />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/suite" element={<Suite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
      <ChatProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      </ChatProvider>
      </ProjectProvider>
    </AuthProvider>
  );
}
