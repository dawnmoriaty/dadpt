import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

import {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
} from '@/modules/user/hooks';
import { UserList } from '@/modules/user/components/UserList';
import { UserFormModal } from '@/modules/user/components/UserFormModal';
import type { User, CreateUserRequest, UpdateUserRequest } from '@/modules/user/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PAGE_SIZE = 10;

export default function UsersScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    const [page, setPage] = useState(1);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const { users, total, isLoading, error, refetch } = useUsers(page, PAGE_SIZE);

    const createHook = useCreateUser((newUser) => {
        void refetch();
        setModalVisible(false);
    });

    const updateHook = useUpdateUser((_updated) => {
        void refetch();
        setModalVisible(false);
        setEditingUser(null);
    });

    const deleteHook = useDeleteUser((_id) => {
        void refetch();
    });

    const handleOpenCreate = () => {
        setEditingUser(null);
        setModalVisible(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setModalVisible(true);
    };

    const handleDelete = (user: User) => {
        void deleteHook.mutate(user.id);
    };

    const handleSubmit = (data: CreateUserRequest | UpdateUserRequest) => {
        if (editingUser) {
            void updateHook.mutate(editingUser.id, data as UpdateUserRequest);
        } else {
            void createHook.mutate(data as CreateUserRequest);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: isDark ? '#151718' : '#F8FAFC' }]}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? '#2A2E35' : '#E2E8F0' }]}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Users</Text>
                    <Text style={[styles.subtitle, { color: colors.icon }]}>
                        {total} user{total !== 1 ? 's' : ''} total
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.tint }]}
                    onPress={handleOpenCreate}
                >
                    <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            <UserList
                users={users}
                total={total}
                isLoading={isLoading}
                error={error}
                page={page}
                pageSize={PAGE_SIZE}
                onRefresh={refetch}
                onNextPage={() => setPage((p) => Math.min(p + 1, totalPages))}
                onPrevPage={() => setPage((p) => Math.max(p - 1, 1))}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* Form Modal */}
            <UserFormModal
                visible={modalVisible}
                user={editingUser}
                isLoading={createHook.isLoading || updateHook.isLoading}
                onClose={() => {
                    setModalVisible(false);
                    setEditingUser(null);
                }}
                onSubmit={handleSubmit}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    addBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});
