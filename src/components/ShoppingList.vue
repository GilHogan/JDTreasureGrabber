<template>
  <div class="shopping-list">
    <el-dialog v-model="showHistory" title="查看详情" width="60%" :close-on-click-modal="false" align-center>
      <HistoryPrice :auctionDetail="selectHistoryRow.auctionDetail"/>
    </el-dialog>

    <div class="item-title">{{ `抢购列表（顺序执行状态：${processStatusMsg || "-"}）` }}</div>
    <el-form :inline="true" ref="formRef" :model="shoppingList" size="small">
      <el-table :data="shoppingList" border height="200" size="small" ref="tableRef" row-key="key">
        <el-table-column type="index" label="拖动排序" width="65">
          <template #default="scope">
            <div class="drag-to-sort product-link">
              <el-icon>
                <Operation/>
              </el-icon>
              <span>{{ scope.$index + 1 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品名称">
          <template #default="scope">
            <el-text truncated class="product-link" @click="handleOpenLink(scope.row.id)"> {{
                scope.row.productName ||
                (scope.row.id ? "在浏览器中查看" : "")
              }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="200">
          <template #default="scope">
            <span>{{
                `${scope.row.startTime ? dayjs(scope.row.startTime).format("YYYY-MM-DD HH:mm:ss") : ""}~${endTimeFormat(scope.row)}`
              }}</span>
          </template>
        </el-table-column>
        <el-table-column label="价格范围" width="100">
          <template #default="scope">
            {{ `${scope.row.startPrice || ""}~${scope.row.cappedPrice || ""}` }}
          </template>
        </el-table-column>
        <el-table-column label="当前价" width="55">
          <template #default="scope">
            {{ scope.row.currentPrice || "" }}
          </template>
        </el-table-column>
        <el-table-column label="抢购状态" width="75" class="bid-status">
          <template #default="scope">
            <div class="bid-status">
              <el-tag type="info" disable-transitions
                      v-if="scope.row.status == Constants.ShoppingStatus.PENDING">未开始
              </el-tag>
              <el-tag type="primary" disable-transitions
                      v-if="scope.row.status == Constants.ShoppingStatus.IN_PROGRESS">进行中
              </el-tag>
              <el-tag type="warning" disable-transitions
                      v-if="scope.row.status == Constants.ShoppingStatus.FAILED">未获拍
              </el-tag>
              <el-tag type="success" disable-transitions
                      v-if="scope.row.status == Constants.ShoppingStatus.SUCCESS">已获拍
              </el-tag>
              <el-tag type="danger" disable-transitions
                      v-if="scope.row.status == Constants.ShoppingStatus.ERROR">异常
              </el-tag>
              <div v-if="scope.row.statusMsg" style="padding-left: 4px;">
                <el-tooltip :content="scope.row.statusMsg" placement="top" :hide-after="0">
                  <el-icon v-if="scope.row.statusMsg">
                    <Warning/>
                  </el-icon>
                </el-tooltip>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="封面" width="57">
          <template #default="scope">
            <template v-if="imageUrl(scope.row.primaryPic, 'n0')">
              <el-tooltip content="点击预览" placement="top" :hide-after="0">
                <el-image style="width: 40px; height: 40px" :src="imageUrl(scope.row.primaryPic, 'n4')"
                          :preview-src-list="[imageUrl(scope.row.primaryPic, 'n0')]" :z-index="999"
                          :preview-teleported="true"
                          :lazy="true">
                </el-image>
              </el-tooltip>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="商品ID" width="110">
          <template #default="scope">
            <el-form-item :prop="'[' + scope.$index + '].id'" class="shopping-list-form"
                          :rules="[{ required: true, message: '请输入商品ID', trigger: 'blur' }, { type: 'number', message: '请输入数字', trigger: 'blur' }]">
              <el-input size="small" v-model.number="scope.row.id" placeholder="商品ID" :id="`input-id-${scope.$index}`"
                        @input="handleInput('id', scope.$index)"></el-input>
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="抢购方式" width="100">
          <template #default="scope">
            <el-select size="small" v-model="scope.row.biddingMethod">
              <el-option v-for="item in Constants.BiddingMethodOptions" :key="item.value" :label="item.label"
                         :value="item.value">
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="最低价格(元)" width="90">
          <template #default="scope">
            <el-form-item :prop="'[' + scope.$index + '].minPrice'" class="shopping-list-form"
                          :rules="getMinPriceRules(scope.row)"
                          v-show="scope.row.biddingMethod === Constants.BiddingMethod.WITHIN_PRICE_RANGE" size="small">
              <el-input v-model.number="scope.row.minPrice" placeholder="最低价格"
                        :id="`input-minPrice-${scope.$index}`"
                        @input="handleInput('minPrice', scope.$index)"></el-input>
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="最高价格(元)" width="90">
          <template #default="scope">
            <el-form-item :prop="'[' + scope.$index + '].minPrice'" class="shopping-list-form"
                          :rules="getPriceRules(scope.row)"
                          v-show="scope.row.biddingMethod !== Constants.BiddingMethod.ON_OTHERS_BID" size="small">
              <el-input v-model.number="scope.row.price" placeholder="最高价格" :id="`input-price-${scope.$index}`"
                        @input="handleInput('price', scope.$index)"></el-input>
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="加价幅度(元)" width="120">
          <template #default="scope">
            <el-input-number v-show="scope.row.biddingMethod !== Constants.BiddingMethod.ONE_TIME_BID" size="small"
                             v-model="scope.row.markup" :min="1" label="加价幅度(元)"
                             style="width: 100px;"></el-input-number>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleShowHistory(scope.row)"
                       :disabled="!scope.row.auctionDetail">
              详情
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.$index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-form>
    <el-button type="primary" size="small" @click="addItem" style="margin-top: 10px;">添加商品</el-button>
    <el-button type="primary" size="small" @click="clearItemList" style="margin-top: 10px;">清空列表</el-button>
  </div>
</template>

<script>
import { computed, defineComponent, nextTick, onMounted, reactive, toRefs } from "vue";
import { Operation, Warning } from '@element-plus/icons-vue'
import Constants, { API } from "../../constant/constants";
import HistoryPrice from "./HistoryPrice";
import { ElMessage } from 'element-plus';

const dayjs = require("dayjs");

const { Sortable } = require('sortablejs');
const uuid = require('uuid');

export default defineComponent({
  name: "ShoppingList",
  components: { HistoryPrice, Warning, Operation },
  emits: [ "openLink" ],
  props: [],
  setup(props, context) {
    onMounted(() => {
      if (window.ipc) {
        window.ipc.sendInvoke("toMain", { event: "getUserDataProperty", params: Constants.StoreKeys.OPTIONS_KEY })
            .then((data) => {
              if (data) {
                // 初始化表单中的用户配置数据
                dataMap.defaultItemSetting.lastBidCountdownTime = data.defaultLastBidCountdownTime || 300;
                dataMap.defaultItemSetting.markup = data.defaultMarkup || 2;
                dataMap.defaultItemSetting.biddingMethod = data.defaultBiddingMethod || Constants.BiddingMethod.ONE_TIME_BID;
              }
            })
            .catch((e) => console.log("getUserData error = ", e));
      }

      nextTick(() => {
        initDropTable();
      })
    });

    const validatePrice = (row, rule, e, callback) => {
      const value = row.price;
      if (
          row.biddingMethod !== Constants.BiddingMethod.ON_OTHERS_BID
      ) {
        if (!value) {
          callback(new Error("请输入价格"));
          return;
        } else {
          if (!Number.isInteger(value)) {
            callback(new Error("请输入数字值"));
            return;
          }
          if (row.minPrice && value <= row.minPrice) {
            callback(new Error("价格区间有误"));
            return;
          }
        }
      } else {
        if (value && !Number.isInteger(value)) {
          callback(new Error("请输入数字值"));
          return;
        }
      }
      callback();
    };

    const validateMinPrice = (row, rule, e, callback) => {
      const value = row.minPrice;
      if (row.biddingMethod == Constants.BiddingMethod.WITHIN_PRICE_RANGE) {
        if (value) {
          if (!Number.isInteger(value)) {
            callback(new Error("请输入数字值"));
            return;
          }
          if (row.price && value >= row.price) {
            callback(new Error("价格区间有误"));
            return;
          }
        }
      }
      callback();
    };

    /**
     * 列表拖拽处理
     */
    const initDropTable = () => {
      Sortable.create(
          document.querySelector('.el-table__body-wrapper tbody'),
          {
            animation: 150,
            //拖拽结束后触发
            onEnd: (event) => {
              const { oldIndex, newIndex } = event;
              if (oldIndex !== newIndex) {
                // 交换拖拽数据
                const temp = dataMap.shoppingList[oldIndex];
                dataMap.shoppingList[oldIndex] = dataMap.shoppingList[newIndex];
                dataMap.shoppingList[newIndex] = temp;
              }
            },
            handle: ".drag-to-sort"
          }
      );
    }

    const dataMap = reactive({
      dayjs,
      formRef: null,
      tableRef: null,
      shoppingList: [],
      showHistory: false,
      selectHistoryRow: null,
      defaultItemSetting: {
        id: null,
        key: null,
        productName: null,
        price: undefined,
        markup: 2,
        lastBidCountdownTime: 300,
        biddingMethod: Constants.BiddingMethod.ONE_TIME_BID,
        minPrice: undefined,
        startTime: null,
        endTime: null,
        status: Constants.ShoppingStatus.PENDING,
        startPrice: null,
        cappedPrice: null,
        auctionDetail: null,
        primaryPic: null,
        statusMsg: null,
        currentPrice: null,
      },
      endTimeFormat: computed(() => (row) => {
        if (!row || !row.endTime) {
          return "";
        }
        if (dayjs(row.startTime).isBefore(row.endTime, "day")) {
          return `+1 ${dayjs(row.endTime).format("HH:mm:ss")}`;
        }
        return dayjs(row.endTime).format("HH:mm:ss");
      }),
      imageUrl: computed(
          () => (primaryPic, size) => {
            if (primaryPic) {
              return API.image_url + size + "/" + (primaryPic.startsWith("jfs") ? primaryPic : "jfs/" + primaryPic)
            }
          }
      ),
      processStatusMsg: "",
      getPriceRules(row) {
        return [ { validator: (rule, value, callback) => validatePrice(row, rule, value, callback), trigger: "blur" } ]
      },
      getMinPriceRules(row) {
        return [ {
          validator: (rule, value, callback) => validateMinPrice(row, rule, value, callback),
          trigger: "blur"
        } ]
      },
      optionVisible: false,
      Constants,
      handleInput(prop, index) {
        nextTick(() => {
          // 解决element-plus table组件下输入框输入时焦点丢失问题
          const inputEl = document.querySelector(`#input-${prop}-${index}`);
          inputEl.focus()
        })
      },
      async validateForm() {
        const valid = await dataMap.formRef.validate((valid) => valid);
        if (!valid) {
          ElMessage({ message: '列表数据校验失败，请检查', type: 'warning' });
        }
        return valid;
      },
      getShoppingList(lastBidCountdownTime = 300) {
        dataMap.shoppingList.forEach(item => {
          let price = item.price;
          let minPrice = item.minPrice;
          if (item.biddingMethod == Constants.BiddingMethod.ON_OTHERS_BID) {
            price = null;
            minPrice = null;
          } else if (item.biddingMethod == Constants.BiddingMethod.ONE_TIME_BID) {
            minPrice = null;
          }
          item.price = price;
          item.minPrice = minPrice;
          item.lastBidCountdownTime = lastBidCountdownTime;
        })
        return dataMap.shoppingList;
      },
      updateShoppingItem(item) {
        if (!item && !item.key) {
          return;
        }
        const index = dataMap.shoppingList.findIndex(s => s.key == item.key);
        if (index != -1) {
          dataMap.shoppingList[index] = item;
        }
      },
      addItem(productInfo = {}) {
        dataMap.shoppingList.push({
          ...dataMap.defaultItemSetting,
          id: productInfo.id,
          productName: productInfo.productName,
          startTime: productInfo.startTime,
          endTime: productInfo.endTime,
          startPrice: productInfo.startPrice,
          cappedPrice: productInfo.cappedPrice,
          primaryPic: productInfo.primaryPic,
          currentPrice: productInfo.currentPrice,
          key: uuid(),
        })
        nextTick(() => {
          // 更新DOM后滚动到列表底部
          const tableBody = dataMap.tableRef.$el.querySelector('.el-scrollbar__view');
          if (tableBody) {
            // 新增商品后滚动条滚动到列表底部
            dataMap.tableRef.scrollTo({ top: tableBody.scrollHeight });
          }
        });
      },
      handleOpenLink(productId) {
        context.emit("openLink", Constants.API.item_url + productId);
      },
      handleShowHistory(row) {
        dataMap.selectHistoryRow = row;
        dataMap.showHistory = true;
      },
      handleDelete(index) {
        dataMap.shoppingList.splice(index, 1);
      },
      getShoppingListBeforeBid(lastBidCountdownTime) {
        dataMap.shoppingList.forEach(item => {
          let price = item.price;
          let minPrice = item.minPrice;
          if (item.biddingMethod == Constants.BiddingMethod.ON_OTHERS_BID) {
            price = null;
            minPrice = null;
          } else if (item.biddingMethod == Constants.BiddingMethod.ONE_TIME_BID) {
            minPrice = null;
          }
          item.price = price;
          item.minPrice = minPrice;
          item.lastBidCountdownTime = lastBidCountdownTime;
          item.status = Constants.ShoppingStatus.PENDING;
          item.statusMsg = null;
        })
        return dataMap.shoppingList;
      },
      updateProcessStatus(msg) {
        dataMap.processStatusMsg = msg;
      },
      addItemList(itemList) {
        if (itemList && itemList.length > 0) {
          itemList.forEach(item => {
            dataMap.addItem(item);
          })
        }
      },
      clearItemList() {
        dataMap.shoppingList = [];
      },
    })

    return {
      ...toRefs(dataMap),
    };
  },
});
</script>

<style scoped>
/* .el-form--inline .el-form-item {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 12px;
} */

.shopping-list-form {
  margin-right: 0;
}

.drag-to-sort {
  display: flex;
  justify-content: center;
  align-items: center;
}

.bid-status {
  display: flex;
  justify-content: center;
}
</style>
