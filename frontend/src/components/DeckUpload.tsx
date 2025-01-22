import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';

const UploadBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  border: `2px dashed ${theme.palette.primary.main}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

interface DeckUploadProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export const DeckUpload: React.FC<DeckUploadProps> = ({
  onUpload,
  isLoading = false,
  error,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
        '.pptx',
      ],
    },
    maxFiles: 1,
  });

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', my: 4 }}>
      <UploadBox
        {...getRootProps()}
        sx={{
          opacity: isLoading ? 0.7 : 1,
          pointerEvents: isLoading ? 'none' : 'auto',
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon
          sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
        />
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? 'Drop your pitch deck here'
            : 'Drag and drop your pitch deck here'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Supported formats: PDF, PPTX
        </Typography>
        {isLoading && (
          <CircularProgress
            size={24}
            sx={{ mt: 2 }}
          />
        )}
      </UploadBox>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
