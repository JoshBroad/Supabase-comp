
-- Fix share_token default value to use valid base64 encoding with URL-safe replacements
-- because 'base64url' is not a supported encoding type in standard PostgreSQL encode()

DO $$
BEGIN
    -- Drop the default first if it exists (it might be in an invalid state)
    ALTER TABLE public.build_sessions ALTER COLUMN share_token DROP DEFAULT;
    
    -- Set the new default using base64 and character replacement
    ALTER TABLE public.build_sessions 
    ALTER COLUMN share_token 
    SET DEFAULT replace(replace(encode(extensions.gen_random_bytes(24), 'base64'), '+', '-'), '/', '_');
END $$;
