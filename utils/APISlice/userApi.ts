import { baseApi } from './baseApi';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<any, void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUsersParams: builder.query<any, any>({
      query: (params) => ({
        url: '/users',
        params: {
          page: params.page,
          limit: params.limit,
          filterByDate: params.filterByDate,
          startDate: params.startDate,
          endDate: params.endDate,
          search: params.search,
          officeId: params.officeId,
        },
      }),
      providesTags: ['User'],
    }),
    registerUser: builder.mutation<any, any>({
      query: (body) => ({
        url: '/users/register',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<any, { userId: string; body: any }>({
      query: ({ userId, body }) => ({
        url: `/users/${userId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    getUserById: builder.query<any, string>({
      query: (id) => `/users/${id}`,
      providesTags: ['User'],
    }),
    getUser: builder.query<any, string>({
      query: (id) => `/users/${id}`,
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<any, any>({
      query: (body) => ({
        url: '/users/update-profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updatePassword: builder.mutation<any, any>({
      query: (body) => ({
        url: '/users/update-password',
        method: 'PATCH',
        body,
      }),
    }),
    createQrToken: builder.mutation<any, any>({
      query: (body) => ({
        url: '/qr-token',
        method: 'POST',
        body,
      }),
    }),
    uploadUsers: builder.mutation<any, { officeId: string; file: File }>({
      query: ({ officeId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/users/upload/${officeId}`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['User'],
    }),

    // --- New Admin <-> Office Assignment Endpoints ---

    assignOfficeToAdmin: builder.mutation<any, { adminId: string; officeId: string }>({
      query: ({ adminId, officeId }) => ({
        url: `/users/admin/assign-location/${adminId}/${officeId}`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    removeOfficeFromAdmin: builder.mutation<any, { adminId: string; officeId: string }>({
      query: ({ adminId, officeId }) => ({
        url: `/users/admin/remove-location/${adminId}/${officeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    getAdminOffices: builder.query<any, string>({
      query: (adminId) => `/users/admin/${adminId}/locations`,
      providesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUsersParamsQuery,
  useRegisterUserMutation,
  useUpdateUserMutation,
  useGetUserByIdQuery,
  useGetUserQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
  useCreateQrTokenMutation,
  useUploadUsersMutation,
  useAssignOfficeToAdminMutation,
  useRemoveOfficeFromAdminMutation,
  useGetAdminOfficesQuery,
} = userApi;
