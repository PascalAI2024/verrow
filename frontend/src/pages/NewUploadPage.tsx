import { Box,Container,Stack,Typography } from '@mui/material';
import React,{ useEffect,useState } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import PipelineStatusChip from '../components/PipelineStatusChip';
import UnifiedUploader,{ FileUploadItem,TriggeredUpdatePayload } from '../components/UnifiedUploader';
import { useNotification } from '../contexts/NotificationContext';
import { createDataset,CreateDatasetPayload } from '../services/api';

const NewUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  const [fileUpdateTrigger, setFileUpdateTrigger] = useState<TriggeredUpdatePayload | null>(null);

  useEffect(() => {
    const navigationState = location.state as { mappedFileId?: string; ingestionJobId?: string; error?: string };

    if (navigationState?.mappedFileId && navigationState?.ingestionJobId) {
      showNotification(`Mappings confirmed for file ${navigationState.mappedFileId}. Starting data ingestion.`, 'success');
      setFileUpdateTrigger({
        fileIdToUpdate: navigationState.mappedFileId,
        newIngestionJobId: navigationState.ingestionJobId,
        newStatus: 'processing_data',
      });
      // Clear the state from navigation history to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    } else if (navigationState?.error && navigationState?.mappedFileId) {
      showNotification(`Mapping confirmation failed for ${navigationState.mappedFileId}: ${navigationState.error}`, 'error');
      // Potentially set a different status for the file in UnifiedUploader if needed
      // For now, just show notification and clear state.
      // setFileUpdateTrigger({
      //   fileIdToUpdate: navigationState.mappedFileId,
      //   newStatus: 'failed', // Or 'ready_for_mapping' to allow retry?
      //   newIngestionJobId: '' // No job ID if it failed before submission
      // });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, showNotification]);

  const handleFileReadyForMapping = (fileItem: FileUploadItem) => {
    if (fileItem.fileId) {
      navigate(`/mapping/${fileItem.fileId}`); // MappingPage will navigate back with state
    } else {
      console.error("File ID missing for mapping navigation. File details:", {
        id: fileItem.id,
        fileName: fileItem.file.name,
        status: fileItem.status,
        fileId: fileItem.fileId,
        jobId: fileItem.jobId
      });
      showNotification(`Error: File ID is missing for ${fileItem.file.name}. Cannot proceed to mapping.`, 'error');
    }
  };

  const handleAllFilesProcessed = async (
    processedFiles: FileUploadItem[],
    datasetMeta?: { name: string; description?: string; tags?: string[] }
  ) => {
    showNotification('All files have been processed.', 'info');

    const successfulFiles = processedFiles.filter(f => f.status === 'completed' && f.fileId);

    if (datasetMeta && datasetMeta.name && successfulFiles.length > 0) {
      try {
        const payload: CreateDatasetPayload = {
          name: datasetMeta.name,
          description: datasetMeta.description,
          tags: datasetMeta.tags,
          fileIds: successfulFiles.map(f => f.fileId!), // fileId should exist for completed files
        };
        const newDataset = await createDataset(payload);
        showNotification(`Dataset "${newDataset.name}" created successfully!`, 'success');
        navigate(`/datasets/${newDataset.id}`);
      } catch (error: any) {
        console.error('Failed to create dataset:', error);
        showNotification(error.userMessage || 'Failed to create dataset. Files were processed individually.', 'error');
        // Decide where to navigate if dataset creation fails, e.g., to a generic datasets page or leave on uploader
      }
    } else if (datasetMeta && datasetMeta.name && successfulFiles.length === 0) {
      showNotification('No files were successfully processed to create a dataset.', 'warning');
    } else if (successfulFiles.length === 1 && (!datasetMeta || !datasetMeta.name) ) {
      // If single file and no dataset name, user might have already navigated via onFileReadyForMapping
      // Or, if they waited, navigate to the mapping page of the single successful file if not already done.
      // This case might need refinement based on desired UX for single file completion.
      // For now, we assume onFileReadyForMapping handles single file navigation.
    }
    // If multiple successful files but no dataset name, they are just processed individually.
    // User can find them in a general file list or create a dataset later.
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stage CSV files for mapping and ingestion.
            </Typography>
          </Box>
          <PipelineStatusChip />
        </Box>
        <UnifiedUploader
          onFileReadyForMapping={handleFileReadyForMapping}
          onUploadComplete={(items, datasetMeta) => handleAllFilesProcessed(items, datasetMeta)}
          triggerFileUpdate={fileUpdateTrigger}
        />
      </Stack>
    </Container>
  );
};

export default NewUploadPage;
